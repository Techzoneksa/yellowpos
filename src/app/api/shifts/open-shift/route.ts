import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { getAuthContext } from '@/app/api/_auth';
import { logAudit } from '@/lib/audit.server';

const inputSchema = z.object({
  opening_float: z.number().min(0).default(0),
  notes: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  try {
    const authCtx = await getAuthContext(request);
    const { userId } = authCtx;

    const body = await request.json().catch(() => ({}));
    const data = inputSchema.parse(body);

    const { data: existing } = await supabaseAdmin
      .from('shifts')
      .select('*')
      .eq('cashier_id', userId)
      .eq('status', 'open')
      .maybeSingle();
    if (existing) return NextResponse.json(existing);

    const { data: inserted, error } = await supabaseAdmin
      .from('shifts')
      .insert({
        cashier_id: userId,
        opening_float: data.opening_float,
        notes: data.notes ?? null,
        status: 'open',
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    await logAudit({
      userId,
      action: 'shift.open',
      entityType: 'shift',
      entityId: inserted.id,
      newValue: { opening_float: data.opening_float, notes: data.notes ?? null },
    });

    return NextResponse.json(inserted);
  } catch (err: any) {
    const status = err.message?.includes('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}