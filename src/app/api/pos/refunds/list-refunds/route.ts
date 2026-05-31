import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { getAuthContext } from '@/app/api/_auth';

const inputSchema = z.object({ limit: z.number().int().min(1).max(200).default(50) });

export async function POST(request: Request) {
  try {
    await getAuthContext(request);
    const body = await request.json().catch(() => ({}));
    const data = inputSchema.parse(body);

    const { data: rows, error } = await supabaseAdmin
      .from('refunds')
      .select('*')
      .order('refunded_at', { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);

    const orderIds = Array.from(new Set((rows ?? []).map((r: any) => r.order_id).filter(Boolean)));
    const cashierIds = Array.from(new Set((rows ?? []).map((r: any) => r.cashier_id).filter(Boolean)));

    const [ordR, profR] = await Promise.all([
      orderIds.length ? supabaseAdmin.from('orders').select('id, order_number, total_including_vat').in('id', orderIds) : Promise.resolve({ data: [] as any[] }),
      cashierIds.length ? supabaseAdmin.from('profiles').select('id, full_name, username').in('id', cashierIds) : Promise.resolve({ data: [] as any[] }),
    ]);

    const ordMap = new Map((ordR.data ?? []).map((o: any) => [o.id, o]));
    const nameMap = new Map((profR.data ?? []).map((p: any) => [p.id, p.full_name || p.username || '']));

    return NextResponse.json((rows ?? []).map((r: any) => ({
      ...r,
      order_number: ordMap.get(r.order_id)?.order_number ?? null,
      order_total: ordMap.get(r.order_id)?.total_including_vat ?? null,
      cashier_name: nameMap.get(r.cashier_id) || '',
    })));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}