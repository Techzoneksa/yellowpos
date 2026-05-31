import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { getAuthContext } from '@/app/api/_auth';
import { logAudit } from '@/lib/audit.server';

const inputSchema = z.object({
  shift_id: z.string().uuid(),
  closing_cash: z.number().min(0),
  notes: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  try {
    const authCtx = await getAuthContext(request);
    const { userId } = authCtx;
    const body = await request.json().catch(() => ({}));
    const data = inputSchema.parse(body);

    const { data: shift, error: sErr } = await supabaseAdmin
      .from('shifts')
      .select('*')
      .eq('id', data.shift_id)
      .single();
    if (sErr) throw new Error(sErr.message);
    if (shift.cashier_id !== userId) {
      const { data: roles } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .in('role', ['owner', 'manager']);
      if (!roles || roles.length === 0) throw new Error('Forbidden');
    }
    if (shift.status === 'closed') throw new Error('Shift already closed');

    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('shift_id', data.shift_id);
    const orderIds = (orders ?? []).map((o: any) => o.id);

    let cashNet = 0;
    if (orderIds.length) {
      const { data: pays } = await supabaseAdmin
        .from('payments')
        .select('amount, method')
        .in('order_id', orderIds);
      for (const p of pays ?? []) {
        if (p.method === 'cash') cashNet += Number(p.amount);
      }
    }

    let movementsNet = 0;
    const { data: movs } = await supabaseAdmin
      .from('cash_drawer_movements')
      .select('type, amount')
      .eq('shift_id', data.shift_id);
    for (const m of movs ?? []) {
      movementsNet += (m.type === 'pay_in' ? 1 : -1) * Number(m.amount);
    }

    const expected = Number(shift.opening_float) + cashNet + movementsNet;
    const variance = data.closing_cash - expected;

    const { data: updated, error } = await supabaseAdmin
      .from('shifts')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closing_cash: data.closing_cash,
        expected_cash: expected,
        variance,
        notes: data.notes ?? shift.notes,
      })
      .eq('id', data.shift_id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    await logAudit({
      userId,
      action: 'shift.close',
      entityType: 'shift',
      entityId: data.shift_id,
      newValue: {
        closing_cash: data.closing_cash,
        expected_cash: expected,
        variance,
        notes: data.notes ?? null,
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    const status = err.message === 'Forbidden' ? 403 : err.message?.includes('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}