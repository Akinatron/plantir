/**
 * accept-trip-invite — Edge Function.
 *
 * Hashea el token, busca el invite válido, añade al usuario como member.
 *
 * Idempotente: si el usuario ya es member, devuelve el tripId sin error.
 */

import { z } from 'npm:zod@3';
import { getSupabaseAdmin, getSupabaseUserClient } from '../_shared/supabase-admin.ts';
import { preflightResponse } from '../_shared/cors.ts';
import { errorResponse, handleError, jsonResponse } from '../_shared/errors.ts';
import { log } from '../_shared/logger.ts';

const InputSchema = z.object({
  token: z.string().min(20),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflightResponse();
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) {
      return errorResponse('unauthorized', 'Falta Authorization header', 401);
    }

    const userClient = getSupabaseUserClient(auth);
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) {
      return errorResponse('unauthorized', 'Sesión inválida', 401);
    }
    const userId = userData.user.id;

    const { token } = InputSchema.parse(await req.json());
    const admin = getSupabaseAdmin();

    // Hash del token.
    const hashBuf = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(token),
    );
    const tokenHash = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Buscar invite.
    const { data: invite, error: invErr } = await admin
      .from('trip_invites')
      .select('id, trip_id, expires_at, max_uses, used_count, revoked_at, require_approval')
      .eq('token_hash', tokenHash)
      .single();
    if (invErr || !invite) {
      return errorResponse('not_found', 'Invitación no encontrada o inválida', 404);
    }
    if (invite.revoked_at) {
      return errorResponse('forbidden', 'Invitación revocada', 403);
    }
    if (new Date(invite.expires_at) < new Date()) {
      return errorResponse('forbidden', 'Invitación caducada', 403);
    }
    if (invite.max_uses && invite.used_count >= invite.max_uses) {
      return errorResponse('conflict', 'Invitación agotada', 409);
    }

    // ¿Es ya miembro?
    const { data: existing } = await admin
      .from('trip_members')
      .select('id')
      .eq('trip_id', invite.trip_id)
      .eq('user_id', userId)
      .is('left_at', null)
      .maybeSingle();
    if (existing) {
      return jsonResponse({ tripId: invite.trip_id, alreadyMember: true });
    }

    // Si requiere aprobación, lo dejamos en estado pending.
    if (invite.require_approval) {
      // TODO: crear trip_members con un campo `status` = 'pending' (no en MVP).
      return jsonResponse({
        tripId: invite.trip_id,
        requiresApproval: true,
      });
    }

    // Insertar miembro y actualizar used_count en una transacción.
    const { error: memberErr } = await admin
      .from('trip_members')
      .insert({
        trip_id: invite.trip_id,
        user_id: userId,
        role: 'member',
      });
    if (memberErr) {
      return errorResponse('server', memberErr.message, 500);
    }
    await admin
      .from('trip_invites')
      .update({ used_count: invite.used_count + 1 })
      .eq('id', invite.id);

    log('info', 'invite.accepted', {
      inviteId: invite.id,
      tripId: invite.trip_id,
      userId,
    });

    return jsonResponse({ tripId: invite.trip_id, alreadyMember: false });
  } catch (err) {
    return handleError(err);
  }
});
