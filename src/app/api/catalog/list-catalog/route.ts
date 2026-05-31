import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { getAuthContext } from '@/app/api/_auth';

export async function POST(request: Request) {
  try {
    const authCtx = await getAuthContext(request);
    const [cats, prods, groups, addons, links] = await Promise.all([
      supabaseAdmin.from('categories').select('*').order('sort_order'),
      supabaseAdmin.from('products').select('*').order('name_ar'),
      supabaseAdmin.from('addon_groups').select('*').order('name_ar'),
      supabaseAdmin.from('addons').select('*').order('name_ar'),
      supabaseAdmin.from('product_addon_groups').select('*'),
    ]);
    for (const r of [cats, prods, groups, addons, links]) {
      if (r.error) throw new Error(r.error.message);
    }
    return NextResponse.json({
      categories: cats.data ?? [],
      products: prods.data ?? [],
      addonGroups: groups.data ?? [],
      addons: addons.data ?? [],
      productAddonGroups: links.data ?? [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}