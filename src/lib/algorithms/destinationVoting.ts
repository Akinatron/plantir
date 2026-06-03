export type DestinationProposal = {
  id: string;
  createdAt?: string;
};

export type UpvoteVote = {
  type: 'upvote';
  userId: string;
  proposalId: string;
};

export type ScoreVote = {
  type: 'score';
  userId: string;
  proposalId: string;
  score: 1 | 2 | 3 | 4 | 5;
};

export type YesNoMaybeValue = 'yes' | 'no' | 'maybe';

export type YesNoMaybeVote = {
  type: 'yesNoMaybe';
  userId: string;
  proposalId: string;
  value: YesNoMaybeValue;
};

export type RankingVote = {
  type: 'ranking';
  userId: string;
  proposalIds: string[];
};

export type DestinationVote = UpvoteVote | ScoreVote | YesNoMaybeVote | RankingVote;

export type DestinationVotingMode = 'upvote' | 'score' | 'yesNoMaybe' | 'ranking';

export type DestinationVotingInput = {
  proposals: DestinationProposal[];
  votes: DestinationVote[];
  mode: DestinationVotingMode;
};

export type DestinationVotingResult = {
  proposalId: string;
  score: number;
  voteCount: number;
  yesCount: number;
  maybeCount: number;
  noCount: number;
  averageScoreBasisPoints?: number;
  rank: number;
  isWinner: boolean;
  isTiedWinner: boolean;
};

export function rankDestinationProposals(
  input: DestinationVotingInput,
): DestinationVotingResult[] {
  const proposalIds = new Set(input.proposals.map((proposal) => proposal.id));
  const scores = new Map<string, DestinationVotingResult>();

  for (const proposal of input.proposals) {
    scores.set(proposal.id, {
      proposalId: proposal.id,
      score: 0,
      voteCount: 0,
      yesCount: 0,
      maybeCount: 0,
      noCount: 0,
      rank: 0,
      isWinner: false,
      isTiedWinner: false,
    });
  }

  const userVotes = dedupeVotesByUser(input.votes, input.mode);

  for (const vote of userVotes) {
    applyVote(vote, input.mode, proposalIds, scores);
  }

  const ranked = [...scores.values()].sort((left, right) => {
    return (
      right.score - left.score ||
      right.voteCount - left.voteCount ||
      right.yesCount - left.yesCount ||
      left.noCount - right.noCount ||
      left.proposalId.localeCompare(right.proposalId)
    );
  });

  const winningScore = ranked[0]?.score;
  const tiedWinnerCount =
    winningScore === undefined
      ? 0
      : ranked.filter((result) => result.score === winningScore).length;

  return ranked.map((result, index) => ({
    ...result,
    rank: index + 1,
    isWinner: index === 0 && tiedWinnerCount === 1,
    isTiedWinner: winningScore !== undefined && result.score === winningScore && tiedWinnerCount > 1,
  }));
}

export function getDestinationWinner(
  input: DestinationVotingInput,
): DestinationVotingResult | null {
  const ranked = rankDestinationProposals(input);
  const first = ranked[0];

  if (!first || first.isTiedWinner) {
    return null;
  }

  return first;
}

function dedupeVotesByUser(
  votes: readonly DestinationVote[],
  mode: DestinationVotingMode,
): DestinationVote[] {
  const latestByUser = new Map<string, DestinationVote>();

  for (const vote of votes) {
    if (vote.type !== mode) {
      throw new Error(`Vote type ${vote.type} does not match voting mode ${mode}.`);
    }

    latestByUser.set(vote.userId, vote);
  }

  return [...latestByUser.values()];
}

function applyVote(
  vote: DestinationVote,
  mode: DestinationVotingMode,
  proposalIds: ReadonlySet<string>,
  scores: Map<string, DestinationVotingResult>,
): void {
  if (mode === 'ranking') {
    if (vote.type !== 'ranking') {
      throw new Error('Ranking mode requires ranking votes.');
    }

    applyRankingVote(vote, proposalIds, scores);
    return;
  }

  if (vote.type === 'ranking') {
    throw new Error('Ranking votes are only valid in ranking mode.');
  }

  const proposalId = vote.proposalId;

  if (!proposalIds.has(proposalId)) {
    throw new Error(`Vote references unknown proposal ${proposalId}.`);
  }

  const result = getScore(scores, proposalId);

  if (mode === 'upvote') {
    result.score += 1;
    result.voteCount += 1;
  } else if (mode === 'score') {
    if (vote.type !== 'score') {
      throw new Error('Score mode requires score votes.');
    }

    result.score += vote.score;
    result.voteCount += 1;
    result.averageScoreBasisPoints = Math.trunc((result.score * 10_000) / result.voteCount);
  } else if (mode === 'yesNoMaybe') {
    if (vote.type !== 'yesNoMaybe') {
      throw new Error('Yes/no/maybe mode requires yes/no/maybe votes.');
    }

    result.voteCount += 1;

    if (vote.value === 'yes') {
      result.score += 2;
      result.yesCount += 1;
    } else if (vote.value === 'maybe') {
      result.score += 1;
      result.maybeCount += 1;
    } else {
      result.noCount += 1;
    }
  }
}

function applyRankingVote(
  vote: RankingVote,
  proposalIds: ReadonlySet<string>,
  scores: Map<string, DestinationVotingResult>,
): void {
  const seen = new Set<string>();
  const proposalCount = proposalIds.size;

  for (let index = 0; index < vote.proposalIds.length; index += 1) {
    const proposalId = vote.proposalIds[index];

    if (!proposalId) {
      continue;
    }

    if (!proposalIds.has(proposalId)) {
      throw new Error(`Ranking references unknown proposal ${proposalId}.`);
    }

    if (seen.has(proposalId)) {
      throw new Error(`Ranking contains duplicate proposal ${proposalId}.`);
    }

    seen.add(proposalId);
    const result = getScore(scores, proposalId);
    result.score += proposalCount - index;
    result.voteCount += 1;
  }
}

function getScore(
  scores: Map<string, DestinationVotingResult>,
  proposalId: string,
): DestinationVotingResult {
  const result = scores.get(proposalId);

  if (!result) {
    throw new Error(`Unknown proposal ${proposalId}.`);
  }

  return result;
}
