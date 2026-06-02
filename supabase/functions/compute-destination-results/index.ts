/**
 * compute-destination-results — Edge Function.
 *
 * Recalcula el ranking de propuestas. Implementación server-side con
 * scoring: upvotes, score 1-5, ranking Borda, yes/no/maybe.
 */

import { z } from 'npm:zod@3';
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts';
import { preflightResponse } from '../_shared/cors.ts';
import { errorResponse, handleError, jsonResponse } from '../_shared/errors.ts';

const InputSchema = z.object({ pollId: z.string().uuid() });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflightResponse();
  try {
    const { pollId } = InputSchema.parse(await req.json());
    const admin = getSupabaseAdmin();

    const { data: poll } = await admin
      .from('polls')
      .select('id, type, settings')
      .eq('id', pollId)
      .single();
    if (!poll) return errorResponse('not_found', 'Poll no encontrado', 404);
    if (poll.type !== 'destination') {
      return errorResponse('validation', 'Poll no es de tipo destination', 422);
    }

    const settings = (poll.settings ?? {}) as { system?: string; anonymous?: boolean };
    const system = settings.system ?? 'upvote';
    const anonymous = settings.anonymous ?? false;

    // Cargar propuestas activas.
    const { data: proposals } = await admin
      .from('destination_proposals')
      .select('id, total_price_cents, capacity')
      .eq('poll_id', pollId)
      .neq('status', 'deleted');

    // Cargar votos.
    const { data: votes } = await admin
      .from('destination_votes')
      .select('proposal_id, vote_value, is_active')
      .eq('poll_id', pollId)
      .eq('is_active', true);

    // Calcular score por propuesta.
    const scoreById = new Map<string, number>();
    for (const p of proposals ?? []) scoreById.set(p.id as unknown as string, 0);

    if (system === 'upvote') {
      // 1 voto = +1, -1 = -1.
      for (const v of votes ?? []) {
        const val = (v.vote_value as number) ?? 0;
        scoreById.set(v.proposal_id as unknown as string, (scoreById.get(v.proposal_id as unknown as string) ?? 0) + val);
      }
    } else if (system === 'score') {
      // Suma de scores 1-5, promedio.
      const counts = new Map<string, { sum: number; n: number }>();
      for (const v of votes ?? []) {
        const id = v.proposal_id as unknown as string;
        const c = counts.get(id) ?? { sum: 0, n: 0 };
        c.sum += (v.vote_value as number) ?? 0;
        c.n += 1;
        counts.set(id, c);
      }
      for (const [id, c] of counts) {
        scoreById.set(id, c.n > 0 ? c.sum / c.n : 0);
      }
    } else if (system === 'yes_no_maybe') {
      // yes=+1, no=-1, maybe=+0.5
      for (const v of votes ?? []) {
        const raw = v.vote_value as string;
        const val = raw === 'yes' ? 1 : raw === 'no' ? -1 : 0.5;
        scoreById.set(v.proposal_id as unknown as string, (scoreById.get(v.proposal_id as unknown as string) ?? 0) + val);
      }
    } else {
      // ranking: Borda count.
      const counts = new Map<string, number>();
      for (const v of votes ?? []) {
        const id = v.proposal_id as unknown as string;
        const rank = (v.vote_value as number) ?? 99;
        // Mayor rank = mejor; Borda = proposals.length - rank.
        const points = (proposals?.length ?? 0) - rank;
        counts.set(id, (counts.get(id) ?? 0) + points);
      }
      for (const [id, s] of counts) scoreById.set(id, s);
    }

    // Ordenar por score desc, ties: price_asc, capacity_desc.
    const ranked = (proposals ?? [])
      .map((p) => {
        const score = scoreById.get(p.id as unknown as string) ?? 0;
        return { id: p.id, score, price: p.total_price_cents ?? null, capacity: p.capacity ?? null };
      })
      .sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        const ap = a.price ?? Number.MAX_SAFE_INTEGER;
        const bp = b.price ?? Number.MAX_SAFE_INTEGER;
        if (ap !== bp) return ap - bp;
        return (b.capacity ?? 0) - (a.capacity ?? 0);
      })
      .map((p, i) => ({ proposalId: p.id, rank: i + 1, score: p.score }));

    return jsonResponse({ pollId, ranking: ranked, system, anonymous });
  } catch (err) {
    return handleError(err);
  }
});
