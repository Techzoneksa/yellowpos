import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { getAuthContext } from '@/app/api/_auth';
import { logAudit } from '@/lib/audit.server';

const inputSchema = z.object({
  legal_name_ar: z.string().min(1).max(200).optional(),
  legal_name_en: z.string().max(200).optional(),
  brand_name_ar: z.string().min(1).max(120).optional(),
  brand_name_en: z.string().max(120).optional(),
  branch_ar: z.string().max(200).optional(),
  branch_en: z.string().max(200).optional(),
  vat_number: z.string().max(50).optional(),
  commercial_registration: z.string().max(50).optional(),
  national_address: z.string().max(200).optional(),
  vat_rate: z.number().min(0).max(1).optional(),
  prices_include_vat: z.boolean().optional(),
  receipt_width: z.enum(['58mm', '80mm']).optional(),
  printer_type: z.enum(['USB', 'Bluetooth', 'Network']).optional(),
  print_method: z.enum(['browser', 'driver']).optional(),
  print_copies: z.number().int().min(1).max(5).optional(),
  logo_url: z.string().url().nullable().optional(),
  footer_note_ar: z.string().max(200).optional(),
  footer_note_en: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  try {
    const authCtx = await getAuthContext(request);
    const { userId } = authCtx;
    const body = await request.json().catch(() => ({}));
    const data = inputSchema.parse(body);

    await (async () => {
      const { data: d, error } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', userId).in('role', ['owner', 'manager']);
      if (error) throw new Error(error.message);
      if (!d || d.length === 0) throw new Error('Forbidden: admin role required');
    })();

    const { data: row, error } = await supabaseAdmin
      .from('restaurant_settings')
      .update(data)
      .eq('id', true)
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    await logAudit({
      userId,
      action: 'settings.update',
      entityType: 'restaurant_settings',
      entityId: 'singleton',
      newValue: data,
    });

    return NextResponse.json(row);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message?.includes('Forbidden') ? 403 : 500 });
  }
}