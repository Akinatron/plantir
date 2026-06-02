/**
 * mark-settlement-paid — Edge Function.
 *
 * Registra un pago entre dos miembros y actualiza balances.
 */

import { z } from 'npm:zod@3';
import { getSupabaseAdmin, getSupabaseUserClient } from '../_shared/supabase-admin.ts';
import { preflightResponse } from '../_shared/cors.ts';
import { errorResponse, handleError, jsonResponse } from '../_shared/errors.ts';

const InputSchema = z.object({
  tripId: z.string().uuid(),
  fromMemberId: z.string().uuid(),
  toMemberId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  currency: z.string().length(3),
  note: z.string().max(200).optional().nullable(),
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
    if (body.fromMemberId === body.toMemberId) {
      return errorResponse('validation', 'from y to no pueden coincidir', 422);
    }
    const admin = getSupabaseAdmin();

    // Insertar pago.
    const { data: payment, error: insErr } = await admin
      .from('settlement_payments')
      .insert({
        trip_id: body.tripId,
        from_member_id: body.fromMemberId,
        to_member_id: body.toMemberId,
        amount_cents: body.amountCents,
        currency: body.currency,
        note: body.note ?? null,
        created_by: user.user.id,
        paid_at: new Date().toISOString(),
        status: 'completed',
      })
      .select()
      .single();
    if (insErr) {
      return errorResponse('server', insErr.message, 500);
    }
    return jsonResponse({ paymentId: payment.id });
  } catch (err) {
    return handleError(err);
  }
});
