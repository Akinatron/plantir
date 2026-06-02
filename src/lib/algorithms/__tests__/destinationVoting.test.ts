/**
 * Tests del módulo destinationVoting.ts
 *
 * Cubre los 7 casos obligatorios del briefing.
 */

import {
  rankProposals,
  Proposal,
  Vote,
  RankingConfig,
} from '../destinationVoting';
import { Cents, DestinationProposalId, UserId } from '@/types';

const pid = (s: string) => s as DestinationProposalId;
const uid = (s: string) => s as UserId;
const c = (n: number) => n as Cents;

const baseCfg: RankingConfig = {
  system: 'upvote',
  anonymous: false,
  tieBreaker: ['created_asc', 'price_asc', 'capacity_desc'],
};

describe('destinationVoting.ts', () => {
  it('caso 1: upvotes puros', () => {
    const proposals: Proposal[] = [{ id: pid('p1') }, { id: pid('p2') }];
    const votes: Vote[] = [
      { userId: uid('u1'), proposalId: pid('p1'), value: 1 },
      { userId: uid('u2'), proposalId: pid('p1'), value: 1 },
      { userId: uid('u3'), proposalId: pid('p2'), value: 1 },
    ];
    const r = rankProposals(proposals, votes, baseCfg);
    expect(r[0]!.id).toBe(pid('p1'));
    expect(r[0]!.score).toBe(2);
    expect(r[0]!.rank).toBe(1);
    expect(r[1]!.id).toBe(pid('p2'));
    expect(r[1]!.score).toBe(1);
  });

  it('caso 2: score 1-5 con promedio y orden', () => {
    const proposals: Proposal[] = [{ id: pid('p1') }, { id: pid('p2') }];
    const votes: Vote[] = [
      { userId: uid('u1'), proposalId: pid('p1'), value: 5 },
      { userId: uid('u2'), proposalId: pid('p1'), value: 4 },
      { userId: uid('u3'), proposalId: pid('p2'), value: 2 },
    ];
    const r = rankProposals(proposals, votes, { ...baseCfg, system: 'score' });
    expect(r[0]!.id).toBe(pid('p1'));
    expect(r[0]!.score).toBe(9);
    expect(r[1]!.id).toBe(pid('p2'));
    expect(r[1]!.score).toBe(2);
  });

  it('caso 3: ranking Borda con orden explícito', () => {
    const proposals: Proposal[] = [
      { id: pid('p1') },
      { id: pid('p2') },
      { id: pid('p3') },
    ];
    // 'u1' rankea: p1=1, p2=2, p3=3. Borda: p1=3, p2=2, p3=1.
    const votes: Vote[] = [
      { userId: uid('u1'), proposalId: pid('p1'), value: 1, ranking: 1 },
      { userId: uid('u1'), proposalId: pid('p2'), value: 1, ranking: 2 },
      { userId: uid('u1'), proposalId: pid('p3'), value: 1, ranking: 3 },
    ];
    const r = rankProposals(proposals, votes, { ...baseCfg, system: 'ranking' });
    expect(r[0]!.id).toBe(pid('p1'));
    expect(r[0]!.score).toBe(3);
  });

  it('caso 4: empate → desempate por price_asc', () => {
    const proposals: Proposal[] = [
      { id: pid('p1'), totalPriceCents: c(100) },
      { id: pid('p2'), totalPriceCents: c(50) },
      { id: pid('p3'), totalPriceCents: c(75) },
    ];
    const votes: Vote[] = [
      { userId: uid('u1'), proposalId: pid('p1'), value: 1 },
      { userId: uid('u1'), proposalId: pid('p2'), value: 1 },
      { userId: uid('u1'), proposalId: pid('p3'), value: 1 },
    ];
    const r = rankProposals(proposals, votes, {
      ...baseCfg,
      tieBreaker: ['price_asc'],
    });
    // Mismo score (1 cada uno). Gana el más barato: p2 (50).
    expect(r[0]!.id).toBe(pid('p2'));
    expect(r[1]!.id).toBe(pid('p3'));
    expect(r[2]!.id).toBe(pid('p1'));
  });

  it('caso 4b: empate → desempate por capacity_desc', () => {
    const proposals: Proposal[] = [
      { id: pid('p1'), capacity: 2 },
      { id: pid('p2'), capacity: 6 },
      { id: pid('p3'), capacity: 4 },
    ];
    const votes: Vote[] = [
      { userId: uid('u1'), proposalId: pid('p1'), value: 1 },
      { userId: uid('u1'), proposalId: pid('p2'), value: 1 },
      { userId: uid('u1'), proposalId: pid('p3'), value: 1 },
    ];
    const r = rankProposals(proposals, votes, {
      ...baseCfg,
      tieBreaker: ['capacity_desc'],
    });
    expect(r[0]!.id).toBe(pid('p2'));
    expect(r[1]!.id).toBe(pid('p3'));
    expect(r[2]!.id).toBe(pid('p1'));
  });

  it('caso 5: voto anónimo no expone votante (topVoters undefined)', () => {
    const proposals: Proposal[] = [{ id: pid('p1') }];
    const votes: Vote[] = [
      { userId: uid('u1'), proposalId: pid('p1'), value: 1 },
      { userId: uid('u2'), proposalId: pid('p1'), value: 1 },
    ];
    const r = rankProposals(proposals, votes, { ...baseCfg, anonymous: true });
    expect(r[0]!.topVoters).toBeUndefined();
    expect(r[0]!.voteCount).toBe(2);
    // Modo no anónimo → sí expone.
    const r2 = rankProposals(proposals, votes, { ...baseCfg, anonymous: false });
    expect(r2[0]!.topVoters).toEqual([uid('u1'), uid('u2')]);
  });

  it('caso 6: propuesta borrada (status=deleted) se filtra', () => {
    const proposals: Proposal[] = [
      { id: pid('p1') },
      { id: pid('p2'), status: 'deleted' },
      { id: pid('p3') },
    ];
    const votes: Vote[] = [
      { userId: uid('u1'), proposalId: pid('p1'), value: 1 },
      { userId: uid('u1'), proposalId: pid('p2'), value: 1 },
      { userId: uid('u1'), proposalId: pid('p3'), value: 1 },
    ];
    const r = rankProposals(proposals, votes, baseCfg);
    // p2 NO aparece.
    expect(r.find((x) => x.id === pid('p2'))).toBeUndefined();
    expect(r.length).toBe(2);
  });

  it('caso 7: voto duplicado: upsert, no duplica (score no se dobla)', () => {
    const proposals: Proposal[] = [{ id: pid('p1') }];
    const votes: Vote[] = [
      { userId: uid('u1'), proposalId: pid('p1'), value: 1 },
      // Duplicado del mismo (user, proposal): se queda con el último.
      { userId: uid('u1'), proposalId: pid('p1'), value: 1 },
    ];
    const r = rankProposals(proposals, votes, baseCfg);
    expect(r[0]!.score).toBe(1);
    expect(r[0]!.voteCount).toBe(1);
  });

  it('validación: tieBreaker vacío lanza RangeError', () => {
    const proposals: Proposal[] = [{ id: pid('p1') }];
    expect(() =>
      rankProposals(proposals, [], { ...baseCfg, tieBreaker: [] }),
    ).toThrow(RangeError);
  });
});
