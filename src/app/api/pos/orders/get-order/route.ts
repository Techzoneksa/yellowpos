import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { getAuthContext } from '@/app/api/_auth';

const inputSchema = z.object({ order_id: z.string().uuid() });

export async function POST(request: Request) {
  try {
    const authCtx = await getAuthContext(request);
    const { userId } = authCtx;
    const body = await request.json().catch(() => ({}));
    const data = inputSchema.parse(body);

    const [orderR, itemsR, payR, invR, refundsR, rolesR] = await Promise.all([
      supabaseAdmin.from('orders').select('*').eq('id', data.order_id).single(),
      supabaseAdmin.from('order_items').select('*').eq('order_id', data.order_id),
      supabaseAdmin.from('payments').select('*').eq('order_id', data.order_id).order('paid_at', { ascending: true }),
      supabaseAdmin.from('invoices').select('*').eq('order_id', data.order_id).maybeSingle(),
      supabaseAdmin.from('refunds').select('amount').eq('order_id', data.order_id),
      supabaseAdmin.from('user_roles').select('role').eq('user_id', userId),
    ]);

    const roles = (rolesR.data ?? []).map((r: any) => r.role);
    const canSeeAll = roles.includes('owner') || roles.includes('manager') || roles.includes('finance');
    if (!canSeeAll && orderR.data?.cashier_id !== userId) throw new Error('Forbidden');
    if (orderR.error) throw new Error(orderR.error.message);
    if (itemsR.error) throw new Error(itemsR.error.message);
    if (payR.error) throw new Error(payR.error.message);
    if (invR.error) throw new Error(invR.error.message);
    if (refundsR.error) throw new Error(refundsR.error.message);

    const refundedAmount = (refundsR.data ?? []).reduce((sum: number, r: any) => sum + Number(r.amount), 0);
    const itemIds = (itemsR.data ?? []).map((it: any) => it.id);

    const [{ data: addons }, { data: refundItems, error: refundItemsErr }] = itemIds.length
      ? await Promise.all([
          supabaseAdmin.from('order_item_addons').select('*').in('order_item_id', itemIds),
          supabaseAdmin.from('refund_items').select('order_item_id, quantity').in('order_item_id', itemIds),
        ])
      : [{ data: [] as any[] }, { data: [] as any[], error: null }];
    if (refundItemsErr) throw new Error(refundItemsErr.message);

    const addonsByItem = new Map<string, any[]>();
    for (const a of (addons ?? []) as any[]) {
      const arr = addonsByItem.get(a.order_item_id) ?? [];
      arr.push(a);
      addonsByItem.set(a.order_item_id, arr);
    }
    const refundedQtyByItem = new Map<string, number>();
    for (const ri of (refundItems ?? []) as any[]) {
      refundedQtyByItem.set(ri.order_item_id, (refundedQtyByItem.get(ri.order_item_id) ?? 0) + Number(ri.quantity));
    }

    const items = (itemsR.data ?? []).map((it: any) => ({
      ...it,
      addons: addonsByItem.get(it.id) ?? [],
      already_refunded_quantity: refundedQtyByItem.get(it.id) ?? 0,
      remaining_refundable_quantity: Math.max(0, Number(it.quantity) - (refundedQtyByItem.get(it.id) ?? 0)),
    }));

    let customer: any = null;
    if (orderR.data?.customer_id) {
      const { data: c } = await supabaseAdmin.from('customers').select('*').eq('id', orderR.data.customer_id).maybeSingle();
      customer = c;
    }

    let cashierName = '';
    if (orderR.data?.cashier_id) {
      const { data: prof } = await supabaseAdmin.from('profiles').select('full_name, username').eq('id', orderR.data.cashier_id).maybeSingle();
      cashierName = prof?.full_name || prof?.username || '';
    }

    return NextResponse.json({
      order: orderR.data,
      items,
      payments: payR.data ?? [],
      invoice: invR.data,
      customer,
      cashier_name: cashierName,
      refund_summary: {
        already_refunded_amount: Math.round(refundedAmount * 100) / 100,
        remaining_refundable_amount: Math.max(0, Math.round((Number(orderR.data.total_including_vat) - refundedAmount) * 100) / 100),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message === 'Forbidden' ? 403 : 500 });
  }
}