import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { getAuthContext } from '@/app/api/_auth';
import { logAudit } from '@/lib/audit.server';

async function ensureAdmin(userId: string) {
  const { data, error } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', userId).in('role', ['owner', 'manager']);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('Forbidden: admin role required');
}

export async function POST(request: Request) {
  try {
    const authCtx = await getAuthContext(request);
    const { userId } = authCtx;
    const body = await request.json().catch(() => ({}));

    const data = z.object({
      id: z.string().uuid().optional(),
      name_ar: z.string().min(1).max(80),
      name_en: z.string().max(80).default(''),
      sort_order: z.number().int().default(0),
      color: z.string().max(20).nullable().optional(),
      icon: z.string().max(40).nullable().optional(),
      active: z.boolean().default(true),
    }).parse(body);

    await ensureAdmin(userId);
    const { error } = await supabaseAdmin.from('categories').upsert(data);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message?.includes('Forbidden') ? 403 : 500 });
  }
}