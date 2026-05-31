import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { getAuthContext } from '@/app/api/_auth';

export async function POST(request: Request) {
  try {
    const authCtx = await getAuthContext(request as any);
    const { userId } = authCtx;

    const { data: roles } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', userId);
    const roleList = (roles ?? []).map((r: any) => r.role);
    if (!roleList.some((r: string) => ['owner', 'manager', 'finance'].includes(r))) throw new Error('Forbidden');

    const { data, error } = await supabaseAdmin
      .from('finance_accounts')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return NextResponse.json(data ?? []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message === 'Forbidden' ? 403 : 500 });
  }
}