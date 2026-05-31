import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { getAuthContext } from '@/app/api/_auth';

const inputSchema = z.object({ shift_id: z.string().uuid().optional() });

export async function POST(request: Request) {
  try {
    const authCtx = await getAuthContext(request);
    const body = await request.json().catch(() => ({}));
    const data = inputSchema.parse(body);

    let q = supabaseAdmin.from('cash_drawer_movements').select('*').order('occurred_at', { ascending: false });
    if (data.shift_id) {
      q = q.eq('shift_id', data.shift_id);
    } else {
      const { data: shift } = await supabaseAdmin
        .from('shifts')
        .select('id')
        .eq('cashier_id', authCtx.userId)
        .eq('status', 'open')
        .maybeSingle();
      if (!shift) return NextResponse.json([]);
      q = q.eq('shift_id', shift.id);
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    return NextResponse.json(rows ?? []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}