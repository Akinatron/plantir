/**
 * Hook de balances: combina los gastos + los algoritmos puros del cliente
 * para mostrar balances y settlements al usuario. Para resultados
 * oficiales (p. ej. cerrar cuentas), usar la Edge Function
 * `compute-trip-balances`.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { expensesService } from '@/services/expenses.service';
import { membersService } from '@/services/members.service';
import { computeMemberBalances, computeSettlements, optimizeSettlements } from '@/lib/algorithms/expenses';
import type {
  Expense,
  ExpensePayer,
  ExpenseSplit,
  MemberBalance,
  Settlement,
  TripId,
  TripMember,
  TripMemberId,
} from '@/types';

interface BalancesResult {
  balances: MemberBalance[];
  settlements: Settlement[];
  optimized: Settlement[];
}

export function useBalances(tripId: TripId | null | undefined) {
  const expensesQ = useQuery<Expense[], Error>({
    queryKey: ['expenses-for-balances', tripId],
    queryFn: () => {
      if (!tripId) throw new Error('tripId required');
      return expensesService.listForTrip(tripId).then((r) => {
        if (r.error) throw new Error(r.error.message);
        // Aplanamos a Expense con payers y splits para el algoritmo.
        return r.data.map((e) => ({
          id: e.id,
          amountCents: e.amountCents,
          currency: e.currency,
          payers: e.payers as unknown as ExpensePayer[],
          splits: e.splits as unknown as ExpenseSplit[],
          type: e.type,
          date: e.date,
        }));
      });
    },
    enabled: !!tripId,
    staleTime: 30_000,
  });

  const membersQ = useQuery<TripMember[], Error>({
    queryKey: ['trip-members', tripId],
    queryFn: () => {
      if (!tripId) throw new Error('tripId required');
      return membersService.list(tripId).then((r) => {
        if (r.error) throw new Error(r.error.message);
        return r.data;
      });
    },
    enabled: !!tripId,
    staleTime: 60_000,
  });

  const computed = useMemo<BalancesResult | null>(() => {
    if (!expensesQ.data || !membersQ.data) return null;
    // El algoritmo opera con memberId (string). Mapeamos trip_member_id
    // a userId para mostrar el nombre real al usuario.
    const memberIds = membersQ.data.map((m) => m.userId as unknown as string);
    const balances = computeMemberBalances(expensesQ.data, memberIds);
    // El balance por memberId (no trip_member_id); el caller lo cruza.
    const settlements = computeSettlements(balances);
    const optimized = optimizeSettlements(balances);
    return { balances, settlements, optimized };
  }, [expensesQ.data, membersQ.data]);

  return {
    expenses: expensesQ,
    members: membersQ,
    computed,
  };
}
