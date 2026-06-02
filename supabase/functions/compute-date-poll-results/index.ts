/**
 * compute-date-poll-results — Edge Function.
 *
 * Recalcula los resultados del poll ejecutando el algoritmo de Fase 2
 * server-side y persiste los candidatos en `date_poll_results`.
 */

import { z } from 'npm:zod@3';
import { getSupabaseAdmin, getSupabaseUserClient } from '../_shared/supabase-admin.ts';
import { preflightResponse } from '../_shared/cors.ts';
import { errorResponse, handleError, jsonResponse } from '../_shared/errors.ts';
import { computeDatePollCandidates, PollConfig, UserAvailability } from '../_shared/datePoll.ts';

const InputSchema = z.object({ pollId: z.string().uuid() });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflightResponse();
  try {
    const { pollId } = InputSchema.parse(await req.json());
    const admin = getSupabaseAdmin();

    // Cargar poll.
    const { data: poll, error: pollErr } = await admin
      .from('polls')
      .select('id, trip_id, type, settings, status')
      .eq('id', pollId)
      .single();
    if (pollErr || !poll) {
      return errorResponse('not_found', 'Poll no encontrado', 404);
    }
    if (poll.type !== 'date') {
      return errorResponse('validation', 'Poll no es de tipo date', 422);
    }

    // Cargar rangos permitidos.
    const { data: ranges } = await admin
      .from('date_poll_allowed_ranges')
      .select('start_date, end_date')
      .eq('poll_id', pollId);

    // Cargar miembros del trip.
    const { data: members } = await admin
      .from('trip_members')
      .select('user_id')
      .eq('trip_id', poll.trip_id)
      .is('left_at', null);
    const memberIds = (members ?? []).map((m) => m.user_id as unknown as string);

    // Cargar votos.
    const { data: votes } = await admin
      .from('date_availability_votes')
      .select('user_id, start_date, end_date, availability')
      .eq('poll_id', pollId);

    const availabilities: UserAvailability[] = [];
    const byUser = new Map<string, UserAvailability>();
    for (const v of votes ?? []) {
      const u = v.user_id as unknown as string;
      let entry = byUser.get(u);
      if (!entry) {
        entry = { userId: u, ranges: [] };
        byUser.set(u, entry);
      }
      entry.ranges.push({
        start: v.start_date as unknown as string,
        end: v.end_date as unknown as string,
        availability: v.availability as 'available' | 'prefer' | 'maybe' | 'unavailable',
      });
    }
    for (const v of byUser.values()) availabilities.push(v);

    const settings = (poll.settings ?? {}) as Partial<PollConfig>;
    const config: PollConfig = {
      allowedRanges: (ranges ?? []).map((r) => ({
        start: r.start_date as unknown as string,
        end: r.end_date as unknown as string,
      })),
      minTripDays: settings.minTripDays ?? 2,
      maxTripDays: settings.maxTripDays ?? 14,
      maybeWeight: settings.maybeWeight ?? 0.5,
      preferWeight: settings.preferWeight ?? 1.5,
      canWeight: settings.canWeight ?? 1,
      cannotWeight: settings.cannotWeight ?? 0,
      requiredMemberIds: settings.requiredMemberIds ?? [],
      pendingPolicy: settings.pendingPolicy ?? 'include',
    };

    const candidates = computeDatePollCandidates(config, availabilities, memberIds);

    // Limpiar resultados previos y persistir nuevos.
    await admin.from('date_poll_results').delete().eq('poll_id', pollId);
    if (candidates.length > 0) {
      const rows = candidates.map((c) => ({
        poll_id: pollId,
        candidate_start: c.start,
        candidate_end: c.end,
        duration_days: c.durationDays,
        score: c.score,
        available_member_ids: c.availableMembers,
        preferred_member_ids: c.preferredMembers,
        maybe_member_ids: c.maybeMembers,
        unavailable_member_ids: c.unavailableMembers,
        pending_member_ids: c.pendingMembers,
        required_members_missing: c.requiredMembersMissing,
        rank: c.rank,
      }));
      const { error: insErr } = await admin.from('date_poll_results').insert(rows);
      if (insErr) {
        return errorResponse('server', insErr.message, 500);
      }
    }

    return jsonResponse({ pollId, candidateCount: candidates.length, topRank: candidates[0]?.rank ?? null });
  } catch (err) {
    return handleError(err);
  }
});
