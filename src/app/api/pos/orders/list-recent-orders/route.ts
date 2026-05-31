import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { getAuthContext } from '@/app/api/_auth';

const inputSchema = z.object({
  q: z.string().trim().max(80).optional(),
  today: z.boolean().default(false),
  shiftOnly: z.boolean().default(false),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});

export async function POST(request: Request) {
  try {
    const authCtx = await getAuthContext(request);
    const { userId } = authCtx;
    const body = await request.json().catch(() => ({}));
    const data = inputSchema.parse(body);

    const { data: rolesRows } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    const roles = (rolesRows ?? []).map((r: any) => r.role);
    const canSeeAll = roles.includes('owner') || roles.includes('manager') || roles.includes('finance');

    let orderIdFromInvoice: string | null = null;
    if (data.q && /^INV-/i.test(data.q)) {
      const { data: inv } = await supabaseAdmin
        .from('invoices')
        .select('order_id')
        .ilike('invoice_number', `%${data.q}%`)
        .maybeSingle();
      orderIdFromInvoice = inv?.order_id ?? null;
      if (!orderIdFromInvoice) return NextResponse.json([]);
    }

    let query = supabaseAdmin
      .from('orders')
      .select(`
        id, order_number, order_type, status,
        subtotal_before_discount, discount_amount, total_including_vat,
        vat_included_amount, net_amount_excluding_vat, vat_rate,
        created_at, cashier_id, customer_id
      `)
      .order('created_at', { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);

    if (!canSeeAll) query = query.eq('cashier_id', userId);

    if (data.shiftOnly) {
      const { data: shift } = await supabaseAdmin
        .from('shifts')
        .select('id')
        .eq('cashier_id', userId)
        .eq('status', 'open')
        .maybeSingle();
      if (!shift) return NextResponse.json([]);
      query = query.eq('shift_id', shift.id);
    }

    if (data.today) {
      const now = new Date();
      const riyadhOffsetMs = 3 * 60 * 60 * 1000;
      const startLocal = new Date(now.getTime() + riyadhOffsetMs);
      startLocal.setUTCHours(0, 0, 0, 0);
      const startUtc = new Date(startLocal.getTime() - riyadhOffsetMs);
      query = query.gte('created_at', startUtc.toISOString());
    }

    if (orderIdFromInvoice) {
      query = query.eq('id', orderIdFromInvoice);
    } else if (data.q) {
      query = query.ilike('order_number', `%${data.q}%`);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const orderIds = (rows ?? []).map((r: any) => r.id);
    const cashierIds = Array.from(new Set((rows ?? []).map((r: any) => r.cashier_id).filter(Boolean)));
    const customerIds = Array.from(new Set((rows ?? []).map((r: any) => r.customer_id).filter(Boolean)));

    const [invR, payR, profR, custR] = await Promise.all([
      orderIds.length ? supabaseAdmin.from('invoices').select('order_id, invoice_number').in('order_id', orderIds) : Promise.resolve({ data: [] as any[] }),
      orderIds.length ? supabaseAdmin.from('payments').select('order_id, method, amount').in('order_id', orderIds) : Promise.resolve({ data: [] as any[] }),
      cashierIds.length ? supabaseAdmin.from('profiles').select('id, full_name, username').in('id', cashierIds) : Promise.resolve({ data: [] as any[] }),
      customerIds.length ? supabaseAdmin.from('customers').select('id, phone, name').in('id', customerIds) : Promise.resolve({ data: [] as any[] }),
    ]);

    const invMap = new Map((invR.data ?? []).map((i: any) => [i.order_id, i.invoice_number]));
    const payMap = new Map<string, { method: string; amount: number }[]>();
    for (const p of (payR.data ?? []) as any[]) {
      const arr = payMap.get(p.order_id) ?? [];
      arr.push({ method: p.method, amount: Number(p.amount) });
      payMap.set(p.order_id, arr);
    }
    const nameMap = new Map((profR.data ?? []).map((p: any) => [p.id, p.full_name || p.username || '']));
    const custMap = new Map((custR.data ?? []).map((c: any) => [c.id, c]));

    return NextResponse.json((rows ?? []).map((r: any) => {
      const pays = payMap.get(r.id) ?? [];
      const positive = pays.filter((p) => p.amount > 0);
      const primaryMethod = positive.length > 1 ? 'mixed' : (positive[0]?.method ?? null);
      const cust = r.customer_id ? custMap.get(r.customer_id) : null;
      return {
        ...r,
        invoice_number: invMap.get(r.id) ?? null,
        payment_method: primaryMethod,
        cashier_name: nameMap.get(r.cashier_id) || '',
        customer_phone: cust?.phone ?? null,
        customer_name: cust?.name ?? null,
      };
    }));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}