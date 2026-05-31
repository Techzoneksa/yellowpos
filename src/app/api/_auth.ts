import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;

export type AuthContext = {
  supabase: ReturnType<typeof createClient<Database>>;
  userId: string;
  claims: Record<string, unknown>;
};

export async function getAuthContext(request: Request): Promise<AuthContext> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized: No authorization header provided');
  }

  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    throw new Error('Unauthorized: No token provided');
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) {
    throw new Error('Unauthorized: Invalid token');
  }

  if (!data.claims.sub) {
    throw new Error('Unauthorized: No user ID found in token');
  }

  return {
    supabase,
    userId: data.claims.sub as string,
    claims: data.claims,
  };
}

export function withAuth<T>(
  handler: (ctx: AuthContext, data: T) => Promise<Response>
) {
  return async (request: Request): Promise<Response> => {
    let authCtx: AuthContext;
    try {
      authCtx = await getAuthContext(request);
    } catch (err: any) {
      return Response.json({ error: err.message || 'Unauthorized' }, { status: 401 });
    }

    try {
      const body = request.method === 'GET' || request.method === 'HEAD' 
        ? {} 
        : await request.json().catch(() => ({}));
      
      return await handler(authCtx, body);
    } catch (err: any) {
      return Response.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
  };
}

export function handleEndpoint(
  handlerFn: (ctx: AuthContext, data: any) => Promise<any>
) {
  return withAuth(async (ctx, data) => {
    const result = await handlerFn(ctx, data);
    return Response.json(result);
  });
}