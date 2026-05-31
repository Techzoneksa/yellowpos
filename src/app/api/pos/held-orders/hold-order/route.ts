import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { getAuthContext } from '@/app/api/_auth';

const inputSchema = z.object({
  order_type: z.enum(['dine_in', 'takeaway', 'delivery_app']).default('dine_in'),
  customer_id: z.string().uuid().nullable().optional(),
  note: z.string().max(500).optional(),
  cart: z.any(),
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

    const { data: row, error } = await supabaseAdmin
      .from('held_orders')
      .insert({
        cashier_id: userId,
        shift_id: shift?.id ?? null,
        customer_id: data.customer_id ?? null,
        order_type: data.order_type,
        cart_json: data.cart,
        note: data.note ?? null,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json(row);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}