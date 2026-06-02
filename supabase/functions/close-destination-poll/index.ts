/**
 * close-destination-poll — Edge Function.
 *
 * Cierra el poll, fija destination_proposal_id en el trip, transiciona
 * el estado a `place_decided`. Solo admin puede invocarla.
 */

import { z } from 'npm:zod@3';
import { getSupabaseAdmin, getSupabaseUserClient } from '../_shared/supabase-admin.ts';
import { preflightResponse } from '../_shared/cors.ts';
import { errorResponse, handleError, jsonResponse } from '../_shared/errors.ts';

const InputSchema = z.object({
  pollId: z.string().uuid(),
  selectedProposalId: z.string().uuid(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflightResponse();
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return errorResponse('unauthorized', 'Falta Authorization', 401);
    const userClient = getSupabaseUserClient(auth);
    const { data: user } = await userClient.auth.getUser();
    if (!user.user) return errorResponse('unauthorized', 'Sesión inválida', 401);

    const { pollId, selectedProposalId } = InputSchema.parse(await req.json());
    const admin = getSupabaseAdmin();

    const { data: poll } = await admin
      .from('polls')
      .select('id, trip_id, status')
      .eq('id', pollId)
      .single();
    if (!poll) return errorResponse('not_found', 'Poll no encontrado', 404);
    if (poll.status === 'closed') {
      return errorResponse('conflict', 'El poll ya está cerrado', 409);
    }
    const { data: member } = await admin
      .from('trip_members')
      .select('role')
      .eq('trip_id', poll.trip_id)
      .eq('user_id', user.user.id)
      .is('left_at', null)
      .single();
    if (!member || (member.role !== 'admin' && member.role !== 'organizer')) {
      return errorResponse('forbidden', 'Solo admin puede cerrar polls', 403);
    }

    const { data: proposal } = await admin
      .from('destination_proposals')
      .select('id, title, url, total_price_cents, currency, location_name')
      .eq('id', selectedProposalId)
      .single();
    if (!proposal) {
      return errorResponse('not_found', 'Propuesta no encontrada', 404);
    }

    await admin.from('polls').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', pollId);
    await admin
      .from('trips')
      .update({
        destination_proposal_id: selectedProposalId,
        state: 'place_decided',
        updated_at: new Date().toISOString(),
      })
      .eq('id', poll.trip_id);

    return jsonResponse({ tripId: poll.trip_id, proposalId: selectedProposalId });
  } catch (err) {
    return handleError(err);
  }
});
