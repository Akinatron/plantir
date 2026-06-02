/**
 * Cliente Supabase con service_role key (solo para Edge Functions).
 *
 * En el cliente se usa `anon` key. Aquí, en el servidor, usamos
 * `service_role` para bypassear RLS y hacer operaciones administrativas.
 *
 * ⚠️ NUNCA expongas este módulo al cliente. La service_role key da
 * acceso total a la DB.
 */

import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

let _admin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no definidas');
  }
  _admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}

/**
 * Cliente Supabase con el JWT del usuario que invoca la función.
 * Respeta RLS. Útil para verificar que el usuario tiene permiso antes
 * de operaciones admin.
 */
export function getSupabaseUserClient(authHeader: string | null): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  return createClient(url, anonKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
