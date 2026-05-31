import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { getAuthContext } from '@/app/api/_auth';
import { logAudit } from '@/lib/audit.server';
import { generateZatcaForRefund } from '@/lib/zatca.server';

const inputSchema = z.object({
  order_id: z.string().uuid(),
  reason: z.string().max(500).optional(),
  type: z.enum(['full', 'partial']),
  payment_method: z.enum(['cash', 'card', 'mada', 'apple_pay', 'visa', 'mastercard', 'mixed']),
  items: z.array(z.object({ order_item_id: z.string().uuid(), quantity: z.number().int().min(1) })).default([]),
});

async function ensureAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .in('role', ['owner', 'manager']);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('Forbidden');
}

export async function POST(request: Request) {
  try {
    const authCtx = await getAuthContext(request);
    const { userId } = authCtx;

    const body = await request.json().catch(() => ({}));
    const data = inputSchema.parse(body);

    const { data: order, error: oErr } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', data.order_id)
      .single();
    if (oErr || !order) throw new Error('Order not found');

    const isOwn = order.cashier_id === userId;
    if (!isOwn) await ensureAdmin(supabaseAdmin, userId);

    if (order.status === 'refunded' || order.status === 'cancelled') throw new Error('Order already fully refunded');

    let amount = 0;
    const refundItemRows: { order_item_id: string; quantity: number; amount: number }[] = [];

    const { data: items, error: iErr } = await supabaseAdmin
      .from('order_items')
      .select('id, quantity, unit_price')
      .eq('order_id', data.order_id);
    if (iErr) throw new Error(iErr.message);

    const orderItems = items ?? [];
    const itemIds = orderItems.map((it: any) => it.id);
    const { data: previousRefundItems, error: priErr } = itemIds.length
      ? await supabaseAdmin.from('refund_items').select('order_item_id, quantity').in('order_item_id', itemIds)
      : { data: [] as any[], error: null };
    if (priErr) throw new Error(priErr.message);

    const refundedQtyByItem = new Map<string, number>();
    for (const ri of (previousRefundItems ?? []) as any[]) {
      refundedQtyByItem.set(ri.order_item_id, (refundedQtyByItem.get(ri.order_item_id) ?? 0) + Number(ri.quantity));
    }
    const map = new Map(orderItems.map((it: any) => [it.id, it]));
    const remainingQty = (it: any) => Math.max(0, Number(it.quantity) - (refundedQtyByItem.get(it.id) ?? 0));

    if (data.type === 'full') {
      for (const it of orderItems) {
        const remaining = remainingQty(it);
        if (remaining <= 0) continue;
        const line = Number(it.unit_price) * remaining;
        amount += line;
        refundItemRows.push({ order_item_id: it.id, quantity: remaining, amount: Math.round(line * 100) / 100 });
      }
      amount = Math.round(amount * 100) / 100;
      if (amount <= 0) throw new Error('No remaining quantity available to refund');
    } else {
      if (!data.items.length) throw new Error('Select items to refund');
      const requestedQtyByItem = new Map<string, number>();
      for (const sel of data.items) {
        requestedQtyByItem.set(sel.order_item_id, (requestedQtyByItem.get(sel.order_item_id) ?? 0) + sel.quantity);
      }
      for (const [orderItemId, requestedQuantity] of requestedQtyByItem) {
        const it = map.get(orderItemId);
        if (!it) throw new Error('Item not in order');
        const remaining = remainingQty(it);
        if (requestedQuantity > remaining) throw new Error(`Refund quantity exceeds remaining refundable quantity. Remaining quantity: ${remaining}`);
        const line = Number(it.unit_price) * requestedQuantity;
        amount += line;
        refundItemRows.push({ order_item_id: orderItemId, quantity: requestedQuantity, amount: Math.round(line * 100) / 100 });
      }
      amount = Math.round(amount * 100) / 100;
      if (amount <= 0) throw new Error('Refund amount must be > 0');
    }

    const { data: inv } = await supabaseAdmin.from('invoices').select('invoice_number').eq('order_id', data.order_id).maybeSingle();

    const { data: refund, error } = await supabaseAdmin
      .from('refunds')
      .insert({
        order_id: data.order_id,
        cashier_id: userId,
        reason: data.reason ?? null,
        type: data.type,
        amount,
        payment_method: data.payment_method,
        invoice_number: inv?.invoice_number ?? null,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    if (refundItemRows.length) {
      const rows = refundItemRows.map((it) => ({ ...it, refund_id: refund.id }));
      const { error: rErr } = await supabaseAdmin.from('refund_items').insert(rows);
      if (rErr) throw new Error(rErr.message);
    }

    const { error: pErr } = await supabaseAdmin.from('payments').insert({
      order_id: data.order_id,
      method: data.payment_method,
      amount: -amount,
      reference: `REFUND:${refund.id}`,
    });
    if (pErr) throw new Error(pErr.message);

    const allRemainingRefunded = orderItems.every((it: any) => {
      const requested = refundItemRows.find((r) => r.order_item_id === it.id)?.quantity ?? 0;
      return requested >= remainingQty(it);
    });
    const newStatus = allRemainingRefunded ? 'refunded' : 'partially_refunded';
    const { error: statusErr } = await supabaseAdmin.from('orders').update({ status: newStatus }).eq('id', data.order_id);
    if (statusErr) throw new Error(statusErr.message);

    await logAudit({
      userId,
      action: 'refund.create',
      entityType: 'refund',
      entityId: refund.id,
      newValue: {
        order_id: data.order_id,
        amount: (refund as any).amount,
        reason: (refund as any).reason ?? null,
        new_order_status: newStatus,
      },
    });

    void generateZatcaForRefund((refund as any).id).catch((e) => { console.error('zatca credit-note generation failed', e); });

    return NextResponse.json(refund);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message === 'Forbidden' ? 403 : 500 });
  }
}