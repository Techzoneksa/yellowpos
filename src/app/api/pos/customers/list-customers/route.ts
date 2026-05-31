import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { getAuthContext } from '@/app/api/_auth';

const inputSchema = z.object({
  q: z.string().trim().max(80).optional(),
  limit: z.number().int().min(1).max(500).default(100),
});

export async function POST(request: Request) {
  try {
    await getAuthContext(request);
    const body = await request.json().catch(() => ({}));
    const data = inputSchema.parse(body);

    let q = supabaseAdmin.from('customers').select('*').order('created_at', { ascending: false }).limit(data.limit);
    if (data.q) q = q.or(`phone.ilike.%${data.q}%,name.ilike.%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    return NextResponse.json(rows ?? []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}