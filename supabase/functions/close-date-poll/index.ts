/**
 * close-date-poll — Edge Function.
 *
 * Cierra el poll, fija start_date y end_date en el trip, transiciona el
 * estado del trip a `date_decided`. Solo admin puede invocarla.
 */

import { z } from 'npm:zod@3';
import { getSupabaseAdmin, getSupabaseUserClient } from '../_shared/supabase-admin.ts';
import { preflightResponse } from '../_shared/cors.ts';
import { errorResponse, handleError, jsonResponse } from '../_shared/errors.ts';

const InputSchema = z.object({
  pollId: z.string().uuid(),
  selectedResultId: z.string().uuid(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflightResponse();
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return errorResponse('unauthorized', 'Falta Authorization', 401);
    const userClient = getSupabaseUserClient(auth);
    const { data: user } = await userClient.auth.getUser();
    if (!user.user) return errorResponse('unauthorized', 'Sesión inválida', 401);

    const { pollId, selectedResultId } = InputSchema.parse(await req.json());
    const admin = getSupabaseAdmin();

    // Verificar admin/owner.
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

    // Cargar el resultado seleccionado.
    const { data: result, error: resErr } = await admin
      .from('date_poll_results')
      .select('candidate_start, candidate_end')
      .eq('id', selectedResultId)
      .eq('poll_id', pollId)
      .single();
    if (resErr || !result) {
      return errorResponse('not_found', 'Resultado no encontrado', 404);
    }

    // Transacción: cerrar poll + actualizar trip.
    await admin.from('polls').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', pollId);
    await admin
      .from('trips')
      .update({
        start_date: result.candidate_start,
        end_date: result.candidate_end,
        state: 'date_decided',
        updated_at: new Date().toISOString(),
      })
      .eq('id', poll.trip_id);

    return jsonResponse({
      tripId: poll.trip_id,
      startDate: result.candidate_start,
      endDate: result.candidate_end,
    });
  } catch (err) {
    return handleError(err);
  }
});
