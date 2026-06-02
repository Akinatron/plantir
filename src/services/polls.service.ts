/**
 * Servicio de polls (date poll y destination poll).
 *
 * Los cálculos (results) se hacen en Edge Functions server-side; el cliente
 * solo lee resultados precomputados y emite votos.
 */

import { supabase } from '@/lib/supabase/client';
import { ok, fail, fromSupabaseError } from '@/lib/service-result';
import type { ServiceResult } from '@/lib/service-result';
import type {
  Poll,
  PollId,
  DateAvailabilityVote,
  DatePollAllowedRange,
  DatePollResult,
  UserId,
} from '@/types';

export const pollsService = {
  async getById(pollId: PollId): Promise<ServiceResult<Poll>> {
    const { data, error } = await supabase
      .from('polls')
      .select('*')
      .eq('id', pollId)
      .maybeSingle();
    if (error) return fail(fromSupabaseError(error));
    if (!data) return fail({ code: 'not_found', message: 'Poll no encontrado' });
    return ok(data as Poll);
  },

  async listForTrip(tripId: string): Promise<ServiceResult<Poll[]>> {
    const { data, error } = await supabase
      .from('polls')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });
    if (error) return fail(fromSupabaseError(error));
    return ok((data ?? []) as Poll[]);
  },

  // ─── Date poll ──────────────────────────────────────────────────────────

  async getAllowedRanges(pollId: PollId): Promise<ServiceResult<DatePollAllowedRange[]>> {
    const { data, error } = await supabase
      .from('date_poll_allowed_ranges')
      .select('*')
      .eq('poll_id', pollId);
    if (error) return fail(fromSupabaseError(error));
    return ok((data ?? []) as DatePollAllowedRange[]);
  },

  async getMyDateVotes(
    pollId: PollId,
    userId: UserId,
  ): Promise<ServiceResult<DateAvailabilityVote[]>> {
    const { data, error } = await supabase
      .from('date_availability_votes')
      .select('*')
      .eq('poll_id', pollId)
      .eq('user_id', userId);
    if (error) return fail(fromSupabaseError(error));
    return ok((data ?? []) as DateAvailabilityVote[]);
  },

  async getDateResults(pollId: PollId): Promise<ServiceResult<DatePollResult[]>> {
    const { data, error } = await supabase
      .from('date_poll_results')
      .select('*')
      .eq('poll_id', pollId)
      .order('rank', { ascending: true });
    if (error) return fail(fromSupabaseError(error));
    return ok((data ?? []) as DatePollResult[]);
  },

  /**
   * Emite los votos del usuario actual. Hace upsert: si el usuario ya votó,
   * se actualiza. Un usuario solo puede votar una vez por (poll, day).
   */
  async submitDateVotes(input: {
    pollId: PollId;
    votes: Array<{ start: string; end: string; availability: string }>;
  }): Promise<ServiceResult<null>> {
    const { data: session } = await supabase.auth.getUser();
    if (!session.user) return fail({ code: 'unauthorized', message: 'No autenticado' });
    const rows = input.votes.map((v) => ({
      poll_id: input.pollId,
      user_id: session.user.id,
      start_date: v.start,
      end_date: v.end,
      availability: v.availability,
    }));
    const { error } = await supabase
      .from('date_availability_votes')
      .upsert(rows, { onConflict: 'poll_id,user_id,start_date,end_date' });
    if (error) return fail(fromSupabaseError(error));
    return ok(null);
  },

  /**
   * Recalcula los resultados del poll (server-side). Llamado después de
   * que el último miembro vota, o periódicamente.
   */
  async recomputeDateResults(pollId: PollId): Promise<ServiceResult<null>> {
    const { error } = await supabase.functions.invoke('compute-date-poll-results', {
      body: { pollId },
    });
    if (error) return fail(fromSupabaseError(error));
    return ok(null);
  },

  async closeDatePoll(
    pollId: PollId,
    selectedResultId: string,
  ): Promise<ServiceResult<{ tripId: string; startDate: string; endDate: string }>> {
    const { data, error } = await supabase.functions.invoke('close-date-poll', {
      body: { pollId, selectedResultId },
    });
    if (error) return fail(fromSupabaseError(error));
    return ok(data as { tripId: string; startDate: string; endDate: string });
  },
};
