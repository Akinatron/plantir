/**
 * send-trip-notification — Edge Function.
 *
 * Inserta una notificación en la bandeja in-app del usuario. Llamada
 * por triggers SQL o por Edge Functions de dominio.
 */

import { z } from 'npm:zod@3';
import { getSupabaseAdmin, getSupabaseUserClient } from '../_shared/supabase-admin.ts';
import { preflightResponse } from '../_shared/cors.ts';
import { errorResponse, handleError, jsonResponse } from '../_shared/errors.ts';

const InputSchema = z.object({
  userId: z.string().uuid(),
  tripId: z.string().uuid().optional(),
  type: z.enum([
    'invite_received',
    'poll_opened',
    'poll_closed',
    'date_decided',
    'place_decided',
    'expense_added',
    'settlement_requested',
    'settlement_completed',
    'task_assigned',
    'generic',
  ]),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(500),
  metadata: z.record(z.unknown()).optional(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflightResponse();
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return errorResponse('unauthorized', 'Falta Authorization', 401);
    const userClient = getSupabaseUserClient(auth);
    const { data: user } = await userClient.auth.getUser();
    if (!user.user) return errorResponse('unauthorized', 'Sesión inválida', 401);

    const body = InputSchema.parse(await req.json());
    const admin = getSupabaseAdmin();

    const { data: notif, error: insErr } = await admin
      .from('notifications')
      .insert({
        user_id: body.userId,
        trip_id: body.tripId ?? null,
        type: body.type,
        title: body.title,
        body: body.body,
        metadata: body.metadata ?? {},
      })
      .select('id')
      .single();
    if (insErr) {
      return errorResponse('server', insErr.message, 500);
    }
    return jsonResponse({ notificationId: notif.id });
  } catch (err) {
    return handleError(err);
  }
});
