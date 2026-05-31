import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { getAuthContext } from '@/app/api/_auth';
import { deductOrderInventory } from '@/lib/ops.server';
import { logAudit } from '@/lib/audit.server';
import { generateZatcaForInvoice } from '@/lib/zatca.server';

const itemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
  notes: z.string().max(200).optional(),
  addon_ids: z.array(z.string().uuid()).max(20).default([]),
});

const paymentSchema = z.object({
  method: z.enum(['cash', 'card', 'mada', 'apple_pay', 'visa', 'mastercard', 'mixed']),
  amount: z.number(),
  reference: z.string().max(80).optional(),
});

const inputSchema = z.object({
  order_type: z.enum(['dine_in', 'takeaway', 'delivery_app']).default('dine_in'),
  customer_id: z.string().uuid().nullable().optional(),
  notes: z.string().max(500).optional(),
  discount: z.number().min(0).default(0),
  items: z.array(itemSchema).min(1).max(100),
  payments: z.array(paymentSchema).min(1).max(5),
});

export async function POST(request: Request) {
  try {
    const authCtx = await getAuthContext(request);
    const { userId } = authCtx;

    const body = await request.json().catch(() => ({}));
    const data = inputSchema.parse(body);

    const { data: shift, error: sErr } = await supabaseAdmin
      .from('shifts')
      .select('id')
      .eq('cashier_id', userId)
      .eq('status', 'open')
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!shift) throw new Error('Open a shift before creating orders');

    const productIds = Array.from(new Set(data.items.map((i: any) => i.product_id)));
    const addonIds = Array.from(new Set(data.items.flatMap((i: any) => i.addon_ids)));
    const [{ data: products, error: pErr }, addonRes] = await Promise.all([
      supabaseAdmin.from('products').select('id, name_ar, price, tax_rate, active').in('id', productIds),
      addonIds.length ? supabaseAdmin.from('addons').select('id, name_ar, price_delta, active').in('id', addonIds) : Promise.resolve({ data: [] as any[], error: null }),
    ]);
    if (pErr) throw new Error(pErr.message);
    if (addonRes.error) throw new Error(addonRes.error.message);

    const pMap = new Map((products ?? []).map((p: any) => [p.id, p]));
    const aMap = new Map((addonRes.data ?? []).map((a: any) => [a.id, a]));

    let subtotalBeforeDiscount = 0;
    const itemRows: any[] = [];
    const itemAddonRows: { idx: number; addon: any }[] = [];

    for (let i = 0; i < data.items.length; i++) {
      const it = data.items[i];
      const p = pMap.get(it.product_id);
      if (!p || !p.active) throw new Error('Product unavailable');
      const addonSum = it.addon_ids.reduce((s: number, id: string) => {
        const a = aMap.get(id);
        if (!a) throw new Error('Addon unavailable');
        return s + Number(a.price_delta);
      }, 0);
      const unitInclVat = Number(p.price) + addonSum;
      const lineInclVat = unitInclVat * it.quantity;
      subtotalBeforeDiscount += lineInclVat;
      itemRows.push({
        product_id: p.id,
        name_snapshot: p.name_ar,
        unit_price: unitInclVat,
        quantity: it.quantity,
        line_total: lineInclVat,
        notes: it.notes ?? null,
      });
      for (const aid of it.addon_ids) {
        const a = aMap.get(aid)!;
        itemAddonRows.push({ idx: i, addon: a });
      }
    }

    const round2 = (n: number) => Math.round(n * 100) / 100;
    const discountAmount = Math.min(data.discount, subtotalBeforeDiscount);
    const totalIncludingVat = round2(subtotalBeforeDiscount - discountAmount);
    const vatRate = 0.15;
    const netAmountExcludingVat = round2(totalIncludingVat / (1 + vatRate));
    const vatIncludedAmount = round2(totalIncludingVat - netAmountExcludingVat);

    const paid = data.payments.reduce((s: number, p: any) => s + p.amount, 0);
    if (Math.abs(paid - totalIncludingVat) > 0.01) {
      throw new Error(`Payment ${paid.toFixed(2)} ≠ total ${totalIncludingVat.toFixed(2)}`);
    }

    const { data: order, error: oErr } = await supabaseAdmin
      .from('orders')
      .insert({
        shift_id: shift.id,
        cashier_id: userId,
        customer_id: data.customer_id ?? null,
        order_type: data.order_type,
        status: 'new',
        subtotal_before_discount: round2(subtotalBeforeDiscount),
        discount_amount: round2(discountAmount),
        total_including_vat: totalIncludingVat,
        vat_included_amount: vatIncludedAmount,
        net_amount_excluding_vat: netAmountExcludingVat,
        vat_rate: vatRate,
        notes: data.notes ?? null,
      })
      .select('*')
      .single();
    if (oErr) throw new Error(oErr.message);

    const itemsToInsert = itemRows.map((r) => ({ ...r, order_id: order.id }));
    const { data: insertedItems, error: iErr } = await supabaseAdmin
      .from('order_items')
      .insert(itemsToInsert)
      .select('id');
    if (iErr) throw new Error(iErr.message);

    if (itemAddonRows.length) {
      const oiaRows = itemAddonRows.map(({ idx, addon }) => ({
        order_item_id: insertedItems![idx].id,
        addon_id: addon.id,
        name_snapshot: addon.name_ar,
        price_delta_snapshot: addon.price_delta,
      }));
      const { error: aErr } = await supabaseAdmin.from('order_item_addons').insert(oiaRows);
      if (aErr) throw new Error(aErr.message);
    }

    const payRows = data.payments.map((p: any) => ({
      order_id: order.id,
      method: p.method,
      amount: p.amount,
      reference: p.reference ?? null,
    }));
    const { error: payErr } = await supabaseAdmin.from('payments').insert(payRows);
    if (payErr) throw new Error(payErr.message);

    const { data: invoice, error: invErr } = await supabaseAdmin
      .from('invoices')
      .insert({ order_id: order.id })
      .select('*')
      .single();
    if (invErr) throw new Error(invErr.message);

    const { data: completedOrder, error: cErr } = await supabaseAdmin
      .from('orders')
      .update({ status: 'completed' })
      .eq('id', order.id)
      .select('*')
      .single();
    if (cErr) throw new Error(cErr.message);

    try {
      await deductOrderInventory(
        order.id,
        data.items.map((it: any) => ({ product_id: it.product_id, quantity: it.quantity })),
      );
    } catch (e) { console.error('inventory deduction failed', e); }

    try {
      await supabaseAdmin.from('zatca_invoices').upsert({
        invoice_id: (invoice as any).id,
        order_id: order.id,
        doc_type: 'invoice',
        status: 'generated',
      }, { onConflict: 'invoice_id', ignoreDuplicates: true });
    } catch (e) { console.error('zatca generated-row insert failed', e); }

    void generateZatcaForInvoice((invoice as any).id).catch((e) => {
      console.error('zatca generation failed', e);
    });

    await logAudit({
      userId,
      action: 'order.create',
      entityType: 'order',
      entityId: order.id,
      newValue: {
        order_number: completedOrder.order_number,
        invoice_number: (invoice as any)?.invoice_number ?? null,
        total: (completedOrder as any).total_including_vat,
        order_type: (completedOrder as any).order_type,
        items: data.items.length,
      },
    });

    return NextResponse.json({ order: completedOrder, invoice });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}