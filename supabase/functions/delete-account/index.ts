/**
 * delete-account — Edge Function.
 *
 * Anonimiza el perfil, marca trip_members como left, y delega la
 * eliminación real del user a Supabase Auth (admin API).
 *
 * Mantiene el histórico de gastos (anónimos, sin PII) para que los
 * balances de los trips sigan siendo válidos.
 */

import { getSupabaseAdmin, getSupabaseUserClient } from '../_shared/supabase-admin.ts';
import { preflightResponse } from '../_shared/cors.ts';
import { errorResponse, handleError, jsonResponse } from '../_shared/errors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflightResponse();
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return errorResponse('unauthorized', 'Falta Authorization', 401);
    const userClient = getSupabaseUserClient(auth);
    const { data: user } = await userClient.auth.getUser();
    if (!user.user) return errorResponse('unauthorized', 'Sesión inválida', 401);
    const userId = user.user.id;

    const admin = getSupabaseAdmin();

    // 1) Anonimizar perfil.
    await admin
      .from('profiles')
      .update({
        display_name: 'Usuario eliminado',
        avatar_url: null,
      })
      .eq('id', userId);

    // 2) Salir de todos los trips.
    await admin
      .from('trip_members')
      .update({ left_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('left_at', null);

    // 3) Revocar invites activos creados por el user.
    await admin
      .from('trip_invites')
      .update({ revoked_at: new Date().toISOString() })
      .eq('created_by', userId)
      .is('revoked_at', null);

    // 4) Borrar el user de auth (requiere service_role).
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      return errorResponse('server', delErr.message, 500);
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    return handleError(err);
  }
});
