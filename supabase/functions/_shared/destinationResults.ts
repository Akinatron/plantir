import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.107.0';

export type DestinationPollRow = {
  id: string;
  trip_id: string;
  status: 'draft' | 'active' | 'closed' | 'reopened';
};

export type DestinationProposalRow = {
  id: string;
  trip_id: string;
  poll_id: string | null;
  title: string;
  description: string | null;
  url: string | null;
  location_text: string | null;
  estimated_price_cents: number | null;
  currency_code: string | null;
  price_per_person_cents: number | null;
  capacity: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  pros: string[];
  cons: string[];
};

export type DestinationResultRow = {
  id: string;
  poll_id: string;
  proposal_id: string;
  vote_count: number;
  total_member_count: number;
  score: number;
  rank: number;
  is_winner: boolean;
  is_tied_winner: boolean;
  computed_at: string;
};

type VoteRow = {
  user_id: string;
  proposal_id: string;
};

type MemberRow = {
  user_id: string;
};

const resultSelect =
  'id, poll_id, proposal_id, vote_count, total_member_count, score, rank, is_winner, is_tied_winner, computed_at';

const proposalSelect =
  'id, trip_id, poll_id, title, description, url, location_text, estimated_price_cents, currency_code, price_per_person_cents, capacity, bedrooms, bathrooms, pros, cons';

export async function fetchDestinationPoll(
  serviceClient: SupabaseClient,
  pollId: string,
): Promise<DestinationPollRow> {
  const { data, error } = await serviceClient
    .from('polls')
    .select('id, trip_id, status')
    .eq('id', pollId)
    .eq('type', 'destination')
    .is('deleted_at', null)
    .maybeSingle<DestinationPollRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Destination poll not found.');
  }

  return data;
}

export async function computeAndPersistDestinationResults(
  serviceClient: SupabaseClient,
  poll: DestinationPollRow,
): Promise<DestinationResultRow[]> {
  const [proposals, votes, members] = await Promise.all([
    fetchProposals(serviceClient, poll.id),
    fetchVotes(serviceClient, poll.id),
    fetchMembers(serviceClient, poll.trip_id),
  ]);

  if (proposals.length === 0) {
    throw new Error('Destination poll has no proposals.');
  }

  const latestVoteByUser = new Map<string, VoteRow>();
  for (const vote of votes) {
    latestVoteByUser.set(vote.user_id, vote);
  }

  const voteCounts = new Map(proposals.map((proposal) => [proposal.id, 0]));
  for (const vote of latestVoteByUser.values()) {
    voteCounts.set(vote.proposal_id, (voteCounts.get(vote.proposal_id) ?? 0) + 1);
  }

  const ranked = proposals
    .map((proposal) => ({
      proposal_id: proposal.id,
      vote_count: voteCounts.get(proposal.id) ?? 0,
    }))
    .sort((left, right) => right.vote_count - left.vote_count || left.proposal_id.localeCompare(right.proposal_id));

  const winningVoteCount = ranked[0]?.vote_count ?? 0;
  const tiedWinnerCount = ranked.filter((result) => result.vote_count === winningVoteCount).length;
  const computedAt = new Date().toISOString();
  const rows = ranked.map((result, index) => ({
    poll_id: poll.id,
    proposal_id: result.proposal_id,
    vote_count: result.vote_count,
    total_member_count: members.length,
    score: result.vote_count,
    rank: index + 1,
    is_winner: index === 0 && tiedWinnerCount === 1,
    is_tied_winner: result.vote_count === winningVoteCount && tiedWinnerCount > 1,
    computed_at: computedAt,
  }));

  const { error: deleteError } = await serviceClient
    .from('destination_poll_results')
    .delete()
    .eq('poll_id', poll.id);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  const { data, error } = await serviceClient
    .from('destination_poll_results')
    .insert(rows)
    .select(resultSelect)
    .order('rank', { ascending: true })
    .returns<DestinationResultRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function fetchProposal(
  serviceClient: SupabaseClient,
  proposalId: string,
): Promise<DestinationProposalRow> {
  const { data, error } = await serviceClient
    .from('destination_proposals')
    .select(proposalSelect)
    .eq('id', proposalId)
    .is('deleted_at', null)
    .maybeSingle<DestinationProposalRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Selected proposal not found.');
  }

  return data;
}

async function fetchProposals(serviceClient: SupabaseClient, pollId: string): Promise<DestinationProposalRow[]> {
  const { data, error } = await serviceClient
    .from('destination_proposals')
    .select(proposalSelect)
    .eq('poll_id', pollId)
    .is('deleted_at', null)
    .returns<DestinationProposalRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function fetchVotes(serviceClient: SupabaseClient, pollId: string): Promise<VoteRow[]> {
  const { data, error } = await serviceClient
    .from('destination_votes')
    .select('user_id, proposal_id')
    .eq('poll_id', pollId)
    .returns<VoteRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function fetchMembers(serviceClient: SupabaseClient, tripId: string): Promise<MemberRow[]> {
  const { data, error } = await serviceClient
    .from('trip_members')
    .select('user_id')
    .eq('trip_id', tripId)
    .eq('status', 'joined')
    .returns<MemberRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
