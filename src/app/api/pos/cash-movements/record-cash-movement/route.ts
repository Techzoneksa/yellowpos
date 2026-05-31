import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { getAuthContext } from '@/app/api/_auth';
import { logAudit } from '@/lib/audit.server';

const inputSchema = z.object({
  type: z.enum(['pay_in', 'pay_out']),
  amount: z.number().positive(),
  reason: z.string().max(300).optional(),
});

export async function POST(request: Request) {
  try {
    const authCtx = await getAuthContext(request);
    const { userId } = authCtx;
    const body = await request.json().catch(() => ({}));
    const data = inputSchema.parse(body);

    const { data: shift } = await supabaseAdmin
      .from('shifts')
      .select('id')
      .eq('cashier_id', userId)
      .eq('status', 'open')
      .maybeSingle();
    if (!shift) throw new Error('Open a shift first');

    const { data: row, error } = await supabaseAdmin
      .from('cash_drawer_movements')
      .insert({
        shift_id: shift.id,
        cashier_id: userId,
        type: data.type,
        amount: data.amount,
        reason: data.reason ?? null,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    await logAudit({
      userId,
      action: data.type === 'pay_in' ? 'cash.pay_in' : 'cash.pay_out',
      entityType: 'cash_drawer_movement',
      entityId: row.id,
      newValue: { shift_id: shift.id, amount: data.amount, reason: data.reason ?? null },
    });

    return NextResponse.json(row);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}