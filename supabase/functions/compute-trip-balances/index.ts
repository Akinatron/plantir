/**
 * compute-trip-balances — Edge Function.
 *
 * Recalcula balances y settlements server-side. Re-implementación de los
 * algoritmos puros de `src/lib/algorithms/expenses.ts` adaptada a Deno.
 */

import { z } from 'npm:zod@3';
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts';
import { preflightResponse } from '../_shared/cors.ts';
import { errorResponse, handleError, jsonResponse } from '../_shared/errors.ts';

const InputSchema = z.object({ tripId: z.string().uuid() });

interface Balance {
  memberId: string;
  netCents: number;
  currency: string;
}

interface Settlement {
  fromMemberId: string;
  toMemberId: string;
  amountCents: number;
  currency: string;
}

function computeMemberBalances(
  expenses: Array<{
    amountCents: number;
    currency: string;
    type: string;
    payers: Array<{ memberId: string; amountCents: number }>;
    splits: Array<{ memberId: string; splitType: string; amountCents: number | null; included: boolean }>;
  }>,
  allMemberIds: string[],
  tripCurrency: string,
): Balance[] {
  const nets = new Map<string, number>();
  for (const m of allMemberIds) nets.set(m, 0);
  for (const e of expenses) {
    if (e.currency !== tripCurrency) continue;
    for (const p of e.payers) {
      nets.set(p.memberId, (nets.get(p.memberId) ?? 0) + p.amountCents);
    }
    for (const s of e.splits) {
      if (!s.included || !s.amountCents) continue;
      const delta = e.type === 'expense' ? -s.amountCents : s.amountCents;
      nets.set(s.memberId, (nets.get(s.memberId) ?? 0) + delta);
    }
  }
  return allMemberIds.map((m) => ({ memberId: m, netCents: nets.get(m) ?? 0, currency: tripCurrency }));
}

function computeSettlements(balances: Balance[]): Settlement[] {
  const currency = balances[0]?.currency ?? '';
  const creditors = balances.filter((b) => b.netCents > 0)
    .sort((a, b) => b.netCents - a.netCents)
    .map((b) => ({ id: b.memberId, amount: b.netCents }));
  const debtors = balances.filter((b) => b.netCents < 0)
    .sort((a, b) => b.netCents - a.netCents)
    .map((b) => ({ id: b.memberId, amount: -b.netCents }));
  const settlements: Settlement[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i]!;
    const c = creditors[j]!;
    const transfer = Math.min(d.amount, c.amount);
    if (transfer > 0) {
      settlements.push({
        fromMemberId: d.id,
        toMemberId: c.id,
        amountCents: transfer,
        currency,
      });
    }
    d.amount -= transfer;
    c.amount -= transfer;
    if (d.amount === 0) i++;
    if (c.amount === 0) j++;
  }
  return settlements;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflightResponse();
  try {
    const { tripId } = InputSchema.parse(await req.json());
    const admin = getSupabaseAdmin();

    const { data: trip } = await admin
      .from('trips')
      .select('id, currency')
      .eq('id', tripId)
      .single();
    if (!trip) return errorResponse('not_found', 'Viaje no encontrado', 404);

    const { data: members } = await admin
      .from('trip_members')
      .select('user_id')
      .eq('trip_id', tripId)
      .is('left_at', null);
    const memberIds = (members ?? []).map((m) => m.user_id as unknown as string);

    // Cargar gastos con payers y splits.
    const { data: expenses } = await admin
      .from('expenses')
      .select('id, amount_cents, currency, type, deleted_at, expense_payers(member_id, amount_cents), expense_splits(member_id, split_type, amount_cents, included)')
      .eq('trip_id', tripId)
      .is('deleted_at', null);
    // Supabase devuelve joins como arrays anidados; los aplanamos.
    const flat = (expenses ?? []).map((e: any) => ({
      amountCents: e.amount_cents as number,
      currency: e.currency as string,
      type: e.type as string,
      payers: (e.expense_payers ?? []).map((p: any) => ({
        memberId: p.member_id as string,
        amountCents: p.amount_cents as number,
      })),
      splits: (e.expense_splits ?? []).map((s: any) => ({
        memberId: s.member_id as string,
        splitType: s.split_type as string,
        amountCents: s.amount_cents as number | null,
        included: s.included as boolean,
      })),
    }));

    const balances = computeMemberBalances(flat, memberIds, trip.currency as string);
    const settlements = computeSettlements(balances);

    return jsonResponse({ tripId, balances, settlements });
  } catch (err) {
    return handleError(err);
  }
});
