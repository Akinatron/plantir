/**
 * Hook de gastos del viaje.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesService } from '@/services/expenses.service';
import type { CreateExpenseInput, Expense, TripId } from '@/types';

export function useExpenses(tripId: TripId | null | undefined) {
  return useQuery<(Expense & { payers: unknown[]; splits: unknown[] })[], Error>({
    queryKey: ['expenses', tripId],
    queryFn: () => {
      if (!tripId) throw new Error('tripId required');
      return expensesService.listForTrip(tripId).then((r) => {
        if (r.error) throw new Error(r.error.message);
        return r.data as (Expense & { payers: unknown[]; splits: unknown[] })[];
      });
    },
    enabled: !!tripId,
    staleTime: 30_000,
  });
}

export function useCreateExpense(tripId: TripId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<CreateExpenseInput, 'tripId'>) =>
      expensesService.create({ ...input, tripId }).then((r) => {
        if (r.error) throw new Error(r.error.message);
        return r.data;
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', tripId] });
      qc.invalidateQueries({ queryKey: ['balances', tripId] });
    },
  });
}
