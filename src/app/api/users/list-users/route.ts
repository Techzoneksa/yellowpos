import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { getAuthContext } from '@/app/api/_auth';

type AppRole = 'owner' | 'manager' | 'finance' | 'cashier';

type UserDTO = {
  id: string;
  full_name: string;
  username: string;
  email: string | null;
  role: AppRole;
  active: boolean;
  last_login: string | null;
  created_at: string;
};

async function loadUsers(): Promise<UserDTO[]> {
  const { data: profiles, error: pErr } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, username, active, last_login, created_at')
    .order('created_at', { ascending: false });
  if (pErr) throw new Error(pErr.message);

  const { data: roles, error: rErr } = await supabaseAdmin.from('user_roles').select('user_id, role');
  if (rErr) throw new Error(rErr.message);

  const roleByUser = new Map<string, AppRole>();
  for (const r of roles ?? []) roleByUser.set(r.user_id, r.role as AppRole);

  const { data: authUsers, error: aErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (aErr) throw new Error(aErr.message);
  const emailByUser = new Map<string, string | null>();
  for (const u of authUsers.users) emailByUser.set(u.id, u.email ?? null);

  return (profiles ?? []).map((p) => {
    const email = emailByUser.get(p.id) ?? null;
    const role = roleByUser.get(p.id) ?? 'cashier';
    return { id: p.id, full_name: p.full_name, username: p.username, email: role === 'cashier' ? null : email, role, active: p.active, last_login: p.last_login, created_at: p.created_at };
  });
}

export async function POST(request: Request) {
  try {
    const authCtx = await getAuthContext(request);
    const { userId } = authCtx;

    const { data, error } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', userId).in('role', ['owner', 'manager']);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error('Forbidden: admin role required');

    const users = await loadUsers();
    return NextResponse.json(users);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message?.includes('Forbidden') ? 403 : 500 });
  }
}