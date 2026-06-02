/**
 * export-my-data — Edge Function.
 *
 * Devuelve un JSON con todos los datos personales del usuario (GDPR/LOPDGDD
 * derecho de acceso). Útil para "Exportar mis datos" en el perfil.
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
    const [profile, memberships, votes, expenses, settlements, notifications] = await Promise.all([
      admin.from('profiles').select('*').eq('id', userId).maybeSingle(),
      admin.from('trip_members').select('*, trip:trips(name)').eq('user_id', userId),
      admin.from('date_availability_votes').select('*').eq('user_id', userId),
      admin
        .from('expenses')
        .select('*')
        .eq('created_by', userId)
        .is('deleted_at', null),
      admin.from('settlement_payments').select('*').or(`from_member_id.in.(${userId}),to_member_id.in.(${userId})`),
      admin.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    ]);

    return jsonResponse({
      exportedAt: new Date().toISOString(),
      user: { id: userId, email: user.user.email, createdAt: user.user.created_at },
      profile,
      memberships,
      votes,
      expenses,
      settlements,
      notifications,
    });
  } catch (err) {
    return handleError(err);
  }
});
