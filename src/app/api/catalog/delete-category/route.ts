import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { getAuthContext } from '@/app/api/_auth';

export async function POST(request: Request) {
  try {
    const authCtx = await getAuthContext(request);
    const { userId } = authCtx;
    const body = await request.json().catch(() => ({}));
    const data = z.object({ id: z.string().uuid() }).parse(body);

    await (async () => {
      const { data: d, error } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', userId).in('role', ['owner', 'manager']);
      if (error) throw new Error(error.message);
      if (!d || d.length === 0) throw new Error('Forbidden: admin role required');
    })();

    const { error } = await supabaseAdmin.from('categories').delete().eq('id', data.id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message?.includes('Forbidden') ? 403 : 500 });
  }
}