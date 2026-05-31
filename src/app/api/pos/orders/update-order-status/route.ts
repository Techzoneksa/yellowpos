import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { getAuthContext } from '@/app/api/_auth';

const inputSchema = z.object({
  order_id: z.string().uuid(),
  status: z.enum(['new', 'preparing', 'ready', 'completed', 'cancelled']),
});

export async function POST(request: Request) {
  try {
    const authCtx = await getAuthContext(request);
    const body = await request.json().catch(() => ({}));
    const data = inputSchema.parse(body);

    const { error } = await supabaseAdmin
      .from('orders')
      .update({ status: data.status })
      .eq('id', data.order_id);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}