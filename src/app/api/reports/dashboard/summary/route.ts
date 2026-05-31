import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { getAuthContext } from '@/app/api/_auth';
import { riyadhDayRange } from '@/lib/riyadh-date';

async function assertReportAccess(userId: string) {
  const { data: roles, error } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .in('role', ['owner', 'manager', 'finance']);
  if (error) throw new Error(error.message);
  if (!roles || roles.length === 0) throw new Error('Forbidden');
}

const SALES_STATUSES = ['completed', 'partially_refunded', 'refunded'];
const PAYMENT_METHODS = ['cash', 'mada', 'apple_pay', 'visa', 'mastercard', 'card', 'mixed'];
const r2 = (n: number) => Math.round(n * 100) / 100;

async function loadSalesOrders(f: { date?: string }) {
  const { from, to } = riyadhDayRange(f.date);
  let q = supabaseAdmin
    .from('orders')
    .select('id, order_number, created_at, cashier_id, shift_id, order_type, status, subtotal_before_discount, discount_amount, total_including_vat, vat_included_amount, net_amount_excluding_vat, customer_id, notes')
    .gte('created_at', from)
    .lt('created_at', to)
    .in('status', SALES_STATUSES as any)
    .order('created_at', { ascending: false });
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return { orders: data ?? [], from, to };
}

async function loadPaymentsForOrders(orderIds: string[]) {
  if (!orderIds.length) return [];
  const { data, error } = await supabaseAdmin.from('payments').select('order_id, method, amount, paid_at').in('order_id', orderIds);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function POST(request: Request) {
  try {
    const authCtx = await getAuthContext(request);
    const { userId } = authCtx;

    const body = await request.json().catch(() => ({}));
    const data = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).parse(body ?? {});

    await assertReportAccess(userId);
    const { from, to } = riyadhDayRange(data.date);

    const [{ orders }, refundsRes, shiftsRes, heldRes] = await Promise.all([
      loadSalesOrders({ date: data.date }),
      supabaseAdmin.from('refunds').select('id, amount, payment_method, refunded_at, order_id').gte('refunded_at', from).lt('refunded_at', to),
      supabaseAdmin.from('shifts').select('id, status, closed_at, opened_at').or(`status.eq.open,and(closed_at.gte.${from},closed_at.lt.${to})`),
      supabaseAdmin.from('held_orders').select('id'),
    ]);
    if (refundsRes.error) throw new Error(refundsRes.error.message);
    if (shiftsRes.error) throw new Error(shiftsRes.error.message);

    const orderIds = orders.map((o: any) => o.id);
    const payments = await loadPaymentsForOrders(orderIds);

    const byMethod: Record<string, number> = { cash: 0, mada: 0, apple_pay: 0, visa: 0, mastercard: 0, card: 0 };
    const refundsByMethod: Record<string, number> = { cash: 0, mada: 0, apple_pay: 0, visa: 0, mastercard: 0, card: 0 };
    const positiveByOrder = new Map<string, Set<string>>();
    for (const p of payments) {
      if (Number(p.amount) < 0) continue;
      const s = positiveByOrder.get(p.order_id) || new Set();
      s.add(p.method as string);
      positiveByOrder.set(p.order_id, s);
    }
    const mixedOrderIds = new Set<string>();
    for (const [id, s] of positiveByOrder) if (s.size > 1) mixedOrderIds.add(id);

    for (const p of payments) {
      const m = p.method as string;
      const amt = Number(p.amount);
      if (mixedOrderIds.has(p.order_id)) continue;
      if (amt >= 0) byMethod[m] = (byMethod[m] ?? 0) + amt;
      else refundsByMethod[m] = (refundsByMethod[m] ?? 0) + Math.abs(amt);
    }
    let mixedTotal = 0;
    let mixedRefunds = 0;
    for (const o of orders) if (mixedOrderIds.has(o.id)) mixedTotal += Number(o.total_including_vat);
    for (const p of payments) {
      if (!mixedOrderIds.has(p.order_id)) continue;
      const amt = Number(p.amount);
      if (amt < 0) mixedRefunds += Math.abs(amt);
    }

    const gross = orders.reduce((s: number, o: any) => s + Number(o.total_including_vat), 0);
    const discounts = orders.reduce((s: number, o: any) => s + Number(o.discount_amount), 0);
    const vatIncluded = orders.reduce((s: number, o: any) => s + Number(o.vat_included_amount), 0);
    const refundsTotal = (refundsRes.data ?? []).reduce((s: number, r: any) => s + Number(r.amount), 0);
    const net = gross - refundsTotal;

    const activeShifts = (shiftsRes.data ?? []).filter((s: any) => s.status === 'open').length;
    const closedShiftsToday = (shiftsRes.data ?? []).filter((s: any) => s.status === 'closed').length;
    const ordersCount = orders.length;
    const aov = ordersCount ? gross / ordersCount : 0;

    let topProducts: { product_id: string | null; name: string; qty: number; gross: number }[] = [];
    if (orderIds.length) {
      const { data: items } = await supabaseAdmin
        .from('order_items')
        .select('product_id, name_snapshot, quantity, line_total')
        .in('order_id', orderIds);
      const map = new Map<string, { product_id: string | null; name: string; qty: number; gross: number }>();
      for (const it of items ?? []) {
        const key = it.product_id || it.name_snapshot;
        const cur = map.get(key) || { product_id: it.product_id, name: it.name_snapshot, qty: 0, gross: 0 };
        cur.qty += Number(it.quantity);
        cur.gross += Number(it.line_total);
        map.set(key, cur);
      }
      topProducts = [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
    }

    const cashierAgg = new Map<string, { orders: number; gross: number }>();
    for (const o of orders) {
      const cur = cashierAgg.get(o.cashier_id) || { orders: 0, gross: 0 };
      cur.orders += 1;
      cur.gross += Number(o.total_including_vat);
      cashierAgg.set(o.cashier_id, cur);
    }
    const uniqIds = [...cashierAgg.keys()];
    const profsData = uniqIds.length ? await supabaseAdmin.from('profiles').select('id, full_name, username').in('id', uniqIds) : { data: [] as any[] };
    const profs = profsData.data;
    const nameMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name || p.username || '']));
    const byCashier = [...cashierAgg.entries()].map(([id, v]) => ({
      cashier_id: id,
      cashier_name: nameMap.get(id) || '',
      ...v,
      gross: r2(v.gross),
    })).sort((a, b) => b.gross - a.gross);

    const byOrderType = ['dine_in', 'takeaway', 'delivery_app'].map((tid) => ({
      order_type: tid,
      orders: orders.filter((o: any) => o.order_type === tid).length,
      gross: r2(orders.filter((o: any) => o.order_type === tid).reduce((s: number, o: any) => s + Number(o.total_including_vat), 0)),
    }));

    return NextResponse.json({
      range: { from, to },
      gross: r2(gross),
      net: r2(net),
      discounts: r2(discounts),
      refunds: r2(refundsTotal),
      vatIncluded: r2(vatIncluded),
      ordersCount,
      aov: r2(aov),
      activeShifts,
      closedShiftsToday,
      heldOrders: (heldRes.data ?? []).length,
      byMethod: Object.fromEntries(Object.entries(byMethod).map(([k, v]) => [k, r2(v)])),
      refundsByMethod: Object.fromEntries(Object.entries(refundsByMethod).map(([k, v]) => [k, r2(v)])),
      mixedTotal: r2(mixedTotal),
      mixedRefunds: r2(mixedRefunds),
      byCashier,
      byOrderType,
      topProducts: topProducts.map((p) => ({ ...p, gross: r2(p.gross) })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message === 'Forbidden' ? 403 : 500 });
  }
}