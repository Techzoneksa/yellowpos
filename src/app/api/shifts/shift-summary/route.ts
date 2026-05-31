import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { getAuthContext } from '@/app/api/_auth';

const inputSchema = z.object({ shift_id: z.string().uuid().optional() });

export async function POST(request: Request) {
  try {
    const authCtx = await getAuthContext(request);
    const { userId } = authCtx;
    const body = await request.json().catch(() => ({}));
    const data = inputSchema.parse(body);

    let shiftQuery = supabaseAdmin.from('shifts').select('*');
    shiftQuery = data.shift_id
      ? shiftQuery.eq('id', data.shift_id)
      : shiftQuery.eq('cashier_id', userId).eq('status', 'open');

    const { data: shift, error: sErr } = await shiftQuery.maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!shift) throw new Error('Open shift not found');
    if (shift.cashier_id !== userId) {
      const { data: roles } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .in('role', ['owner', 'manager']);
      if (!roles || roles.length === 0) throw new Error('Forbidden');
    }

    const { data: orders, error: oErr } = await supabaseAdmin
      .from('orders')
      .select('id, discount_amount')
      .eq('shift_id', shift.id);
    if (oErr) throw new Error(oErr.message);
    const orderIds = (orders ?? []).map((o: any) => o.id);

    const byMethod: Record<string, number> = { cash: 0, card: 0, mada: 0, apple_pay: 0, visa: 0, mastercard: 0, mixed: 0 };
    let cashRefunds = 0;
    let totalRefunds = 0;
    if (orderIds.length) {
      const { data: pays, error: pErr } = await supabaseAdmin
        .from('payments')
        .select('amount, method')
        .in('order_id', orderIds);
      if (pErr) throw new Error(pErr.message);
      for (const p of pays ?? []) {
        const amount = Number(p.amount);
        if (amount >= 0) byMethod[p.method] = (byMethod[p.method] ?? 0) + amount;
        else {
          totalRefunds += Math.abs(amount);
          if (p.method === 'cash') cashRefunds += Math.abs(amount);
        }
      }
    }

    let cashAdditions = 0;
    let cashExpenses = 0;
    const { data: movs, error: mErr } = await supabaseAdmin
      .from('cash_drawer_movements')
      .select('type, amount')
      .eq('shift_id', shift.id);
    if (mErr) throw new Error(mErr.message);
    for (const m of movs ?? []) {
      if (m.type === 'pay_in') cashAdditions += Number(m.amount);
      if (m.type === 'pay_out') cashExpenses += Number(m.amount);
    }

    const discounts = (orders ?? []).reduce((sum: number, o: any) => sum + Number(o.discount_amount), 0);
    const expected = Number(shift.opening_float) + byMethod.cash - cashRefunds + cashAdditions - cashExpenses;

    return NextResponse.json({
      shift,
      openingCash: Number(shift.opening_float),
      cashSales: Math.round(byMethod.cash * 100) / 100,
      cashRefunds: Math.round(cashRefunds * 100) / 100,
      cashExpenses: Math.round(cashExpenses * 100) / 100,
      cashAdditions: Math.round(cashAdditions * 100) / 100,
      expected: Math.round(expected * 100) / 100,
      mada: Math.round(byMethod.mada * 100) / 100,
      apple: Math.round(byMethod.apple_pay * 100) / 100,
      visa: Math.round((byMethod.visa + byMethod.mastercard + byMethod.card) * 100) / 100,
      refunded: Math.round(totalRefunds * 100) / 100,
      discounts: Math.round(discounts * 100) / 100,
      net: Math.round((Object.values(byMethod).reduce((sum, n) => sum + n, 0) - totalRefunds) * 100) / 100,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message === 'Forbidden' ? 403 : 500 });
  }
}