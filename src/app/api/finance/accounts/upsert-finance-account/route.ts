import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { getAuthContext } from '@/app/api/_auth';

const inputSchema = z.object({
  id: z.string().uuid().optional(),
  name_en: z.string().min(1).max(120),
  name_ar: z.string().min(1).max(120),
  type: z.enum(['cashbox', 'bank', 'network']),
  account_code: z.string().max(20).nullable().optional(),
  opening_balance: z.number().default(0),
  active: z.boolean().default(true),
  notes: z.string().max(500).nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const authCtx = await getAuthContext(request);
    const { userId } = authCtx;
    const body = await request.json().catch(() => ({}));
    const data = inputSchema.parse(body);

    const { data: roles } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', userId).in('role', ['owner', 'manager']);
    if (!roles || roles.length === 0) throw new Error('Forbidden');

    if (data.id) {
      const { data: updated, error } = await supabaseAdmin
        .from('finance_accounts')
        .update({ name_en: data.name_en, name_ar: data.name_ar, type: data.type, account_code: data.account_code ?? null, opening_balance: data.opening_balance, active: data.active, notes: data.notes ?? null })
        .eq('id', data.id)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json(updated);
    }

    const { data: inserted, error } = await supabaseAdmin
      .from('finance_accounts')
      .insert({ name_en: data.name_en, name_ar: data.name_ar, type: data.type, account_code: data.account_code ?? null, opening_balance: data.opening_balance, balance: data.opening_balance, active: data.active, notes: data.notes ?? null })
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    if (data.opening_balance > 0) {
      await supabaseAdmin.from('account_movements').insert({
        account_id: inserted.id, type: 'opening', amount_in: data.opening_balance, amount_out: 0, balance_after: data.opening_balance, description: 'Opening balance', created_by: userId,
      });
    }
    return NextResponse.json(inserted);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message === 'Forbidden' ? 403 : 500 });
  }
}