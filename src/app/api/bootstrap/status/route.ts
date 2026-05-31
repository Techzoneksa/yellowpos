import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

export async function POST() {
  try {
    const { count, error } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true });
    if (error) throw new Error(error.message);
    return NextResponse.json({ hasUsers: (count ?? 0) > 0 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}