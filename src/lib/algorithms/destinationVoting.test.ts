import { getDestinationWinner, rankDestinationProposals } from './destinationVoting';

const proposals = [{ id: 'house-a' }, { id: 'house-b' }, { id: 'house-c' }];

describe('destination voting algorithm', () => {
  it('supports upvote voting', () => {
    const results = rankDestinationProposals({
      proposals,
      mode: 'upvote',
      votes: [
        { type: 'upvote', userId: 'u1', proposalId: 'house-a' },
        { type: 'upvote', userId: 'u2', proposalId: 'house-a' },
        { type: 'upvote', userId: 'u3', proposalId: 'house-b' },
      ],
    });

    expect(results[0]).toMatchObject({ proposalId: 'house-a', score: 2, isWinner: true });
  });

  it('returns null winner when top proposals are tied', () => {
    const winner = getDestinationWinner({
      proposals: [{ id: 'a' }, { id: 'b' }],
      mode: 'upvote',
      votes: [
        { type: 'upvote', userId: 'u1', proposalId: 'a' },
        { type: 'upvote', userId: 'u2', proposalId: 'b' },
      ],
    });

    expect(winner).toBeNull();
  });

  it('uses the latest vote per user for single-choice modes', () => {
    const results = rankDestinationProposals({
      proposals,
      mode: 'upvote',
      votes: [
        { type: 'upvote', userId: 'u1', proposalId: 'house-a' },
        { type: 'upvote', userId: 'u1', proposalId: 'house-b' },
      ],
    });

    expect(results[0]?.proposalId).toBe('house-b');
    expect(results[0]?.score).toBe(1);
    expect(results.find((result) => result.proposalId === 'house-a')?.score).toBe(0);
  });

  it('supports 1-5 score voting and stores average in basis points', () => {
    const results = rankDestinationProposals({
      proposals: [{ id: 'a' }, { id: 'b' }],
      mode: 'score',
      votes: [
        { type: 'score', userId: 'u1', proposalId: 'a', score: 5 },
        { type: 'score', userId: 'u2', proposalId: 'a', score: 3 },
        { type: 'score', userId: 'u3', proposalId: 'b', score: 4 },
      ],
    });

    expect(results[0]).toMatchObject({
      proposalId: 'a',
      score: 8,
      averageScoreBasisPoints: 40000,
    });
  });

  it('supports yes/no/maybe voting', () => {
    const results = rankDestinationProposals({
      proposals: [{ id: 'a' }, { id: 'b' }],
      mode: 'yesNoMaybe',
      votes: [
        { type: 'yesNoMaybe', userId: 'u1', proposalId: 'a', value: 'yes' },
        { type: 'yesNoMaybe', userId: 'u2', proposalId: 'a', value: 'maybe' },
        { type: 'yesNoMaybe', userId: 'u3', proposalId: 'b', value: 'yes' },
      ],
    });

    expect(results[0]).toMatchObject({ proposalId: 'a', score: 3, yesCount: 1, maybeCount: 1 });
  });

  it('supports ranking with Borda-style points', () => {
    const results = rankDestinationProposals({
      proposals,
      mode: 'ranking',
      votes: [
        { type: 'ranking', userId: 'u1', proposalIds: ['house-c', 'house-a', 'house-b'] },
        { type: 'ranking', userId: 'u2', proposalIds: ['house-c', 'house-b', 'house-a'] },
      ],
    });

    expect(results[0]).toMatchObject({ proposalId: 'house-c', score: 6, isWinner: true });
  });

  it('rejects votes for unknown proposals', () => {
    expect(() =>
      rankDestinationProposals({
        proposals,
        mode: 'upvote',
        votes: [{ type: 'upvote', userId: 'u1', proposalId: 'missing' }],
      }),
    ).toThrow('unknown proposal');
  });
});
