/**
 * create-trip-invite — Edge Function.
 *
 * Genera un token seguro (32 bytes base64url), guarda el hash en
 * `trip_invites.token_hash`, y devuelve el `invite_url` con el token en
 * claro (NUNCA más recuperable, solo el hash queda en DB).
 *
 * Permisos: solo el admin/owner del trip puede crear invites.
 */

import { z } from 'npm:zod@3';
import { getSupabaseAdmin, getSupabaseUserClient } from '../_shared/supabase-admin.ts';
import { corsHeaders, preflightResponse } from '../_shared/cors.ts';
import { errorResponse, handleError, jsonResponse } from '../_shared/errors.ts';
import { log } from '../_shared/logger.ts';

const InputSchema = z.object({
  tripId: z.string().uuid(),
  expiresAt: z.string().datetime().optional(),
  maxUses: z.number().int().positive().max(1000).optional(),
  requireApproval: z.boolean().default(false),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflightResponse();
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) {
      return errorResponse('unauthorized', 'Falta Authorization header', 401);
    }

    const userClient = getSupabaseUserClient(auth);
    const { data: user } = await userClient.auth.getUser();
    if (!user.user) {
      return errorResponse('unauthorized', 'Sesión inválida', 401);
    }

    const body = InputSchema.parse(await req.json());
    const admin = getSupabaseAdmin();

    // Verificar que el user es admin/owner del trip.
    const { data: member, error: memberErr } = await admin
      .from('trip_members')
      .select('role')
      .eq('trip_id', body.tripId)
      .eq('user_id', user.user.id)
      .is('left_at', null)
      .single();
    if (memberErr || !member) {
      return errorResponse('forbidden', 'No eres miembro del viaje', 403);
    }
    if (member.role !== 'admin' && member.role !== 'organizer') {
      return errorResponse('forbidden', 'Solo admin puede crear invitaciones', 403);
    }

    // Generar token seguro (256 bits de entropía).
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = btoa(String.fromCharCode(...tokenBytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Hash SHA-256 del token (hex).
    const hashBuf = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(token),
    );
    const tokenHash = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const expiresAt =
      body.expiresAt ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const { data: invite, error: insertErr } = await admin
      .from('trip_invites')
      .insert({
        trip_id: body.tripId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        max_uses: body.maxUses ?? 50,
        require_approval: body.requireApproval,
        created_by: user.user.id,
      })
      .select('id, expires_at, max_uses')
      .single();
    if (insertErr) {
      return errorResponse('server', insertErr.message, 500);
    }

    // Construir URL absoluta. El scheme `plantir://` lo maneja Expo Linking.
    const appUrl = `plantir://invite/${token}`;
    const webUrl = `${Deno.env.get('PUBLIC_WEB_URL') ?? 'https://plantir.app'}/invite/${token}`;

    log('info', 'invite.created', {
      inviteId: invite.id,
      tripId: body.tripId,
      createdBy: user.user.id,
    });

    return jsonResponse({
      inviteId: invite.id,
      inviteUrl: appUrl,
      webUrl,
      token, // solo se devuelve UNA vez
      expiresAt: invite.expires_at,
      maxUses: invite.max_uses,
    });
  } catch (err) {
    return handleError(err);
  }
});
