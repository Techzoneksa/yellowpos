import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { getAuthContext } from '@/app/api/_auth';

const inputSchema = z.object({
  phone: z.string().trim().min(3).max(20).regex(/^[+0-9\s-]+$/, 'Invalid phone'),
  name: z.string().max(120).optional(),
});

export async function POST(request: Request) {
  try {
    await getAuthContext(request);
    const body = await request.json().catch(() => ({}));
    const data = inputSchema.parse(body);

    const phone = data.phone.replace(/\s+/g, '');
    const { data: existing } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();
    if (existing) return NextResponse.json(existing);

    const { data: row, error } = await supabaseAdmin
      .from('customers')
      .insert({ phone, name: data.name?.trim() || phone })
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json(row);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}