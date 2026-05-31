import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { getAuthContext } from '@/app/api/_auth';

const inputSchema = z.object({ id: z.string().uuid() });

export async function POST(request: Request) {
  try {
    const authCtx = await getAuthContext(request);
    const { userId } = authCtx;
    const body = await request.json().catch(() => ({}));
    const data = inputSchema.parse(body);

    const { data: row, error } = await supabaseAdmin
      .from('held_orders')
      .select('*')
      .eq('id', data.id)
      .eq('cashier_id', userId)
      .single();
    if (error || !row) throw new Error('Held order not found');

    await supabaseAdmin.from('held_orders').delete().eq('id', data.id);
    return NextResponse.json(row);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}