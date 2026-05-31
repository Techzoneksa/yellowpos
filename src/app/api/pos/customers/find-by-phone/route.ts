import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { getAuthContext } from '@/app/api/_auth';

const inputSchema = z.object({ phone: z.string().min(3).max(20) });

export async function POST(request: Request) {
  try {
    await getAuthContext(request);
    const body = await request.json().catch(() => ({}));
    const data = inputSchema.parse(body);

    const { data: row, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('phone', data.phone)
      .maybeSingle();
    if (error) throw new Error(error.message);

    return NextResponse.json(row);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}