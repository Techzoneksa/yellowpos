import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { getAuthContext } from '@/app/api/_auth';
import { logAudit } from '@/lib/audit.server';

const inputSchema = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid().nullable().optional(),
  name_ar: z.string().min(1).max(120),
  name_en: z.string().max(120).default(''),
  sku: z.string().max(40).nullable().optional(),
  price: z.number().min(0),
  image_url: z.string().url().nullable().optional(),
  tax_rate: z.number().min(0).max(1).default(0.15),
  active: z.boolean().default(true),
  product_type: z.enum(['broasted', 'sandwich', 'burger', 'side', 'drink', 'other']).default('other'),
  calories: z.number().int().min(0).nullable().optional(),
  size: z.string().max(40).nullable().optional(),
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

    let oldPrice: number | null = null;
    if (data.id) {
      const { data: prev } = await supabaseAdmin.from('products').select('price').eq('id', data.id).maybeSingle();
      oldPrice = prev ? Number((prev as any).price) : null;
    }

    const { error } = await supabaseAdmin.from('products').upsert(data);
    if (error) throw new Error(error.message);

    await logAudit({
      userId,
      action: data.id ? 'product.update' : 'product.create',
      entityType: 'product',
      entityId: data.id ?? null,
      oldValue: oldPrice != null ? { price: oldPrice } : null,
      newValue: { name_ar: data.name_ar, price: data.price, active: data.active },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message?.includes('Forbidden') ? 403 : 500 });
  }
}