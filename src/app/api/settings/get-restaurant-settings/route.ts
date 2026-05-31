import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { getAuthContext } from '@/app/api/_auth';

export async function POST(request: Request) {
  try {
    const authCtx = await getAuthContext(request);
    const { data, error } = await supabaseAdmin
      .from('restaurant_settings')
      .select('*')
      .eq('id', true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) {
      const { data: inserted, error: iErr } = await supabaseAdmin
        .from('restaurant_settings')
        .insert({ id: true })
        .select('*')
        .single();
      if (iErr) throw new Error(iErr.message);
      return NextResponse.json(inserted);
    }
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}