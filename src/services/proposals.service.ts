/**
 * Servicio de propuestas de destino y votos.
 */

import { supabase } from '@/lib/supabase/client';
import { ok, fail, fromSupabaseError } from '@/lib/service-result';
import type { ServiceResult } from '@/lib/service-result';
import type { DestinationProposal, DestinationVote, PollId, TripId, UserId } from '@/types';

export const proposalsService = {
  async listForPoll(pollId: PollId): Promise<ServiceResult<DestinationProposal[]>> {
    const { data, error } = await supabase
      .from('destination_proposals')
      .select('*')
      .eq('poll_id', pollId)
      .neq('status', 'deleted')
      .order('created_at', { ascending: true });
    if (error) return fail(fromSupabaseError(error));
    return ok((data ?? []) as DestinationProposal[]);
  },

  async getById(proposalId: string): Promise<ServiceResult<DestinationProposal>> {
    const { data, error } = await supabase
      .from('destination_proposals')
      .select('*')
      .eq('id', proposalId)
      .maybeSingle();
    if (error) return fail(fromSupabaseError(error));
    if (!data) return fail({ code: 'not_found', message: 'Propuesta no encontrada' });
    return ok(data as DestinationProposal);
  },

  async create(input: {
    pollId: PollId;
    title: string;
    url?: string;
    description?: string;
    locationName?: string;
    capacity?: number;
    totalPriceCents?: number;
    pricePerPersonCents?: number;
    photos?: string[];
  }): Promise<ServiceResult<DestinationProposal>> {
    const { data, error } = await supabase
      .from('destination_proposals')
      .insert({
        poll_id: input.pollId,
        title: input.title,
        url: input.url ?? null,
        description: input.description ?? null,
        location_name: input.locationName ?? null,
        capacity: input.capacity ?? null,
        total_price_cents: input.totalPriceCents ?? null,
        price_per_person_cents: input.pricePerPersonCents ?? null,
      })
      .select()
      .single();
    if (error) return fail(fromSupabaseError(error));
    return ok(data as DestinationProposal);
  },

  async vote(input: {
    pollId: PollId;
    proposalId: string;
    value: number;
  }): Promise<ServiceResult<DestinationVote>> {
    const { data: session } = await supabase.auth.getUser();
    if (!session.user) return fail({ code: 'unauthorized', message: 'No autenticado' });
    const { data, error } = await supabase
      .from('destination_votes')
      .upsert(
        {
          poll_id: input.pollId,
          proposal_id: input.proposalId,
          user_id: session.user.id,
          vote_value: input.value,
        },
        { onConflict: 'poll_id,proposal_id,user_id' },
      )
      .select()
      .single();
    if (error) return fail(fromSupabaseError(error));
    return ok(data as DestinationVote);
  },

  async closePoll(
    pollId: PollId,
    selectedProposalId: string,
  ): Promise<ServiceResult<null>> {
    const { error } = await supabase.functions.invoke('close-destination-poll', {
      body: { pollId, selectedProposalId },
    });
    if (error) return fail(fromSupabaseError(error));
    return ok(null);
  },
};
