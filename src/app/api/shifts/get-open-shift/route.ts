import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { getAuthContext } from '@/app/api/_auth';

export async function POST(request: Request) {
  try {
    const authCtx = await getAuthContext(request);
    const { userId } = authCtx;

    const { data, error } = await supabaseAdmin
      .from('shifts')
      .select('*')
      .eq('cashier_id', userId)
      .eq('status', 'open')
      .maybeSingle();
    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}