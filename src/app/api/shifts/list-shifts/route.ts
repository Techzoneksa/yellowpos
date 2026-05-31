import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { getAuthContext } from '@/app/api/_auth';

const inputSchema = z.object({ limit: z.number().int().min(1).max(200).default(50) });

export async function POST(request: Request) {
  try {
    const authCtx = await getAuthContext(request);
    const body = await request.json().catch(() => ({}));
    const data = inputSchema.parse(body);

    const { data: rows, error } = await supabaseAdmin
      .from('shifts')
      .select('*')
      .order('opened_at', { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);

    const cashierIds = Array.from(new Set((rows ?? []).map((r: any) => r.cashier_id).filter(Boolean)));
    const { data: profs } = cashierIds.length
      ? await supabaseAdmin.from('profiles').select('id, full_name, username').in('id', cashierIds)
      : { data: [] as any[] };
    const nameMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name || p.username || '']));

    return NextResponse.json((rows ?? []).map((r: any) => ({
      ...r,
      cashier_name: nameMap.get(r.cashier_id) || '',
    })));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}