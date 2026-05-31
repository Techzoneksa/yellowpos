import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { getAuthContext } from '@/app/api/_auth';

const inputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  phone: z.string().min(3).max(20).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export async function POST(request: Request) {
  try {
    await getAuthContext(request);
    const body = await request.json().catch(() => ({}));
    const data = inputSchema.parse(body);

    const { data: row, error } = await supabaseAdmin
      .from('customers')
      .upsert(data)
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json(row);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}