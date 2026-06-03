import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.107.0';

export type AuthenticatedRequest = {
  userId: string;
  accessToken: string;
};

export function createServiceClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase service configuration.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function authenticateRequest(
  request: Request,
  serviceClient: SupabaseClient,
): Promise<AuthenticatedRequest> {
  const authorization = request.headers.get('Authorization');

  if (!authorization?.startsWith('Bearer ')) {
    throw new Error('Authentication required.');
  }

  const accessToken = authorization.replace('Bearer ', '').trim();
  const { data, error } = await serviceClient.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new Error('Authentication required.');
  }

  return {
    userId: data.user.id,
    accessToken,
  };
}
