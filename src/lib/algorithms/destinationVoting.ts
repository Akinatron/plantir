/**
 * Plantir — Algoritmos puros: destination voting
 *
 * Archivo: src/lib/algorithms/destinationVoting.ts
 *
 * Decisión / Razón:
 *   Soportamos 4 sistemas de voto (upvote, score 1..N, ranking Borda,
 *   yes/no/maybe) con un mismo formato de entrada. El desempate se aplica
 *   en el orden declarado por el `RankingConfig.tieBreaker` (lista), lo
 *   que da control fino a la UI.
 *
 *   Si `anonymous === true`, NO se exponen los votantes en
 *   `topVoters` (campo omitido).
 *
 *   Las propuestas con `status === 'deleted'` se filtran ANTES de
 *   rankear (estándar de soft-delete en Supabase).
 *
 * Alternativas descartadas:
 *   - STV (single transferable vote): overkill para MVP, no en PRD.
 *   - Schulze/Condorcet: complejidad sin valor añadido para 4-6
 *     propuestas típicas.
 *
 * Riesgo / Mitigación:
 *   Voto duplicado: la función espera que el caller haya deduplicado
 *   (un voto por (userId, proposalId)). Como red de seguridad, agrupamos
 *   en runtime por esa clave, quedándonos con el último voto (upsert).
 *   Esto cumple "Voto duplicado: upsert, no duplica" del briefing.
 */

import {
  Cents,
  DestinationProposalId,
  UserId,
} from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export type VoteSystem =
  | 'upvote'
  | 'score'
  | 'ranking'
  | 'yes_no_maybe';

export type TieBreaker = 'price_asc' | 'capacity_desc' | 'created_asc';

export interface Proposal {
  id: DestinationProposalId;
  /** Precio total estimado por persona. `null`/`undefined` = no aplica. */
  totalPriceCents?: Cents;
  /** Capacidad (p. ej. plazas disponibles). `null`/`undefined` = no aplica. */
  capacity?: number;
  /** Soft-delete. Por defecto `'active'`. */
  status?: 'active' | 'deleted';
  /** Timestamp ISO de creación, usado por `created_asc`. */
  createdAt?: string;
}

export type VoteValue = number | 'yes' | 'no' | 'maybe' | null;

export interface Vote {
  userId: UserId;
  proposalId: DestinationProposalId;
  value: VoteValue;
  /** Para `ranking`: posición ordinal (1 = favorito). */
  ranking?: number;
}

export interface RankingConfig {
  system: VoteSystem;
  anonymous: boolean;
  tieBreaker: TieBreaker[];
}

export interface RankedProposal {
  id: DestinationProposalId;
  rank: number;
  score: number;
  voteCount: number;
  topVoters?: UserId[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Cálculo de score por sistema
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula el score agregado de una propuesta bajo el sistema indicado.
 * Devuelve un número; un mayor score = mejor rank.
 *
 * Sistemas:
 *   - 'upvote': cada voto con `value > 0` (típicamente 1) suma 1.
 *   - 'score': cada voto suma su `value` (0..N).
 *   - 'ranking' (Borda): la propuesta rankeada en posición `r` (1-based)
 *     recibe `(N - r + 1)` puntos, donde N = número de propuestas
 *     rankeadas por ese votante. No rankeada = 0.
 *   - 'yes_no_maybe': yes=+1, maybe=0, no=-1, null=0.
 */
function scoreProposal(
  proposal: Proposal,
  votes: Vote[],
  system: VoteSystem,
  allProposals: Proposal[],
): { score: number; voteCount: number; voters: UserId[] } {
  const filtered = votes.filter((v) => v.proposalId === proposal.id);
  let score = 0;
  const voters: UserId[] = [];

  switch (system) {
    case 'upvote': {
      for (const v of filtered) {
        if (typeof v.value === 'number' && v.value > 0) {
          score += v.value;
          voters.push(v.userId);
        } else if (v.value === 'yes') {
          score += 1;
          voters.push(v.userId);
        }
        // 'no', 'maybe', null, 0 → no suman.
      }
      break;
    }
    case 'score': {
      for (const v of filtered) {
        if (typeof v.value === 'number') {
          score += v.value;
          if (v.value > 0) voters.push(v.userId);
        } else if (v.value === 'yes') {
          score += 1;
          voters.push(v.userId);
        }
        // 'no', 'maybe', null → no suman (modelo conservadur).
      }
      break;
    }
    case 'ranking': {
      // Para cada votante, calculamos el Borda score de esta propuesta.
      // Agrupamos los votos de cada user.
      const byUser = new Map<UserId, Vote[]>();
      for (const v of filtered) {
        const arr = byUser.get(v.userId) ?? [];
        arr.push(v);
        byUser.set(v.userId, arr);
      }
      for (const [, userVotes] of byUser) {
        // El ranking de esta propuesta para este user = `ranking` o, si no,
        // lo deducimos del orden de los votos (no determinista → usamos ranking).
        const myVote = userVotes[0];
        if (!myVote || myVote.ranking === undefined) continue;
        const r = myVote.ranking;
        // Borda: posición 1 → N puntos, posición N → 1 punto.
        const n = allProposals.length;
        if (r < 1 || r > n) continue;
        const borda = n - r + 1;
        score += borda;
        voters.push(myVote.userId);
      }
      break;
    }
    case 'yes_no_maybe': {
      for (const v of filtered) {
        if (v.value === 'yes') {
          score += 1;
          voters.push(v.userId);
        } else if (v.value === 'no') {
          score -= 1;
          // NO añadimos a voters (no es apoyo).
        } else if (v.value === 'maybe') {
          voters.push(v.userId); // cuenta como "participación", no como apoyo
        }
        // null → no cuentan.
      }
      break;
    }
  }

  return { score, voteCount: voters.length, voters };
}

// ─────────────────────────────────────────────────────────────────────────────
// Desempate
// ─────────────────────────────────────────────────────────────────────────────

function compareTieBreaker(
  a: Proposal,
  b: Proposal,
  tb: TieBreaker,
): number {
  switch (tb) {
    case 'price_asc': {
      const pa = a.totalPriceCents as unknown as number | undefined;
      const pb = b.totalPriceCents as unknown as number | undefined;
      // Ausente → lo mandamos al final (mayor).
      if (pa === undefined && pb === undefined) return 0;
      if (pa === undefined) return 1;
      if (pb === undefined) return -1;
      if (pa === pb) return 0;
      return pa < pb ? -1 : 1;
    }
    case 'capacity_desc': {
      const ca = a.capacity ?? -Infinity;
      const cb = b.capacity ?? -Infinity;
      if (ca === cb) return 0;
      return ca > cb ? -1 : 1;
    }
    case 'created_asc': {
      // Más antiguo gana (orden ascendente por fecha de creación).
      const da = a.createdAt ?? '';
      const db = b.createdAt ?? '';
      if (da === db) return 0;
      return da < db ? -1 : 1;
    }
  }
}

function fullTieBreak(
  a: Proposal,
  b: Proposal,
  tieBreakers: TieBreaker[],
): number {
  for (const tb of tieBreakers) {
    const r = compareTieBreaker(a, b, tb);
    if (r !== 0) return r;
  }
  // Desempate final estable: por id.
  return (a.id as unknown as string).localeCompare(b.id as unknown as string);
}

// ─────────────────────────────────────────────────────────────────────────────
// API principal
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rankea una lista de propuestas según los votos recibidos.
 *
 * Precondiciones (validadas):
 *   - `tieBreaker` no vacío (al menos un criterio de desempate).
 *
 * Comportamiento:
 *   1. Filtra propuestas con `status === 'deleted'`.
 *   2. Deduplica votos por `(userId, proposalId)` quedándose con el último.
 *   3. Calcula score por propuesta y por sistema.
 *   4. Ordena por score desc; en empate aplica `tieBreaker` en orden.
 *   5. Asigna `rank` 1-based.
 *   6. Si `anonymous === false`, añade `topVoters` (lista determinista de
 *      los votantes ordenada por id).
 */
export function rankProposals(
  proposals: Proposal[],
  votes: Vote[],
  config: RankingConfig,
): RankedProposal[] {
  if (config.tieBreaker.length === 0) {
    throw new RangeError('rankProposals: tieBreaker debe tener al menos 1 criterio');
  }

  // 1) Filtra borradas.
  const active = proposals.filter((p) => (p.status ?? 'active') !== 'deleted');

  // 2) Deduplica votos.
  const dedupMap = new Map<string, Vote>();
  for (const v of votes) {
    const key = `${v.userId as unknown as string}|${v.proposalId as unknown as string}`;
    dedupMap.set(key, v);
  }
  const dedupedVotes = Array.from(dedupMap.values());

  // 3) Calcula scores.
  type Scored = {
    proposal: Proposal;
    score: number;
    voteCount: number;
    voters: UserId[];
  };
  const scored: Scored[] = active.map((p) => {
    const r = scoreProposal(p, dedupedVotes, config.system, active);
    return { proposal: p, score: r.score, voteCount: r.voteCount, voters: r.voters };
  });

  // 4) Ordena: score desc, luego tie-breaker.
  scored.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return fullTieBreak(a.proposal, b.proposal, config.tieBreaker);
  });

  // 5+6) Rank + topVoters.
  return scored.map((s, i) => {
    const out: RankedProposal = {
      id: s.proposal.id,
      rank: i + 1,
      score: s.score,
      voteCount: s.voteCount,
    };
    if (!config.anonymous) {
      // Ordena los voters alfabéticamente para determinismo.
      const sortedVoters = [...s.voters].sort((x, y) =>
        (x as unknown as string).localeCompare(y as unknown as string),
      );
      out.topVoters = sortedVoters;
    }
    return out;
  });
}
