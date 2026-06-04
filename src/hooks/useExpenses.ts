import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  computeTripBalances,
  createExpense,
  getExpenseDetail,
  listExpenses,
  listSettlementPayments,
  listSettlementSuggestions,
  markSettlementPaid,
} from '../services/expenseService';
import { MarkSettlementPaidFormValues, ParsedCreateExpenseFormValues } from '../lib/validation/expense';
import { tripQueryKey, tripsQueryKey } from './useTrips';

export const expensesQueryKey = (tripId: string | null | undefined) => ['expenses', tripId] as const;
export const expenseDetailQueryKey = (expenseId: string | null | undefined) =>
  ['expense-detail', expenseId] as const;
export const tripBalancesQueryKey = (tripId: string | null | undefined) => ['trip-balances', tripId] as const;
export const settlementSuggestionsQueryKey = (tripId: string | null | undefined) =>
  ['settlement-suggestions', tripId] as const;
export const settlementPaymentsQueryKey = (tripId: string | null | undefined) =>
  ['settlement-payments', tripId] as const;

export function useExpensesQuery(tripId: string | null | undefined) {
  return useQuery({
    queryKey: expensesQueryKey(tripId),
    queryFn: () => {
      if (!tripId) {
        throw new Error('Cannot load expenses without a trip id.');
      }

      return listExpenses(tripId);
    },
    enabled: Boolean(tripId),
  });
}

export function useExpenseDetailQuery(expenseId: string | null | undefined) {
  return useQuery({
    queryKey: expenseDetailQueryKey(expenseId),
    queryFn: () => {
      if (!expenseId) {
        throw new Error('Cannot load expense without an expense id.');
      }

      return getExpenseDetail(expenseId);
    },
    enabled: Boolean(expenseId),
  });
}

export function useTripBalancesQuery(tripId: string | null | undefined) {
  return useQuery({
    queryKey: tripBalancesQueryKey(tripId),
    queryFn: () => {
      if (!tripId) {
        throw new Error('Cannot compute balances without a trip id.');
      }

      return computeTripBalances(tripId);
    },
    enabled: Boolean(tripId),
  });
}

export function useSettlementSuggestionsQuery(tripId: string | null | undefined) {
  return useQuery({
    queryKey: settlementSuggestionsQueryKey(tripId),
    queryFn: () => {
      if (!tripId) {
        throw new Error('Cannot load settlements without a trip id.');
      }

      return listSettlementSuggestions(tripId);
    },
    enabled: Boolean(tripId),
  });
}

export function useSettlementPaymentsQuery(tripId: string | null | undefined) {
  return useQuery({
    queryKey: settlementPaymentsQueryKey(tripId),
    queryFn: () => {
      if (!tripId) {
        throw new Error('Cannot load settlement payments without a trip id.');
      }

      return listSettlementPayments(tripId);
    },
    enabled: Boolean(tripId),
  });
}

export function useCreateExpenseMutation(tripId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: ParsedCreateExpenseFormValues) => createExpense(values),
    onSuccess: (expense) => {
      queryClient.invalidateQueries({ queryKey: expensesQueryKey(expense.tripId) });
      queryClient.invalidateQueries({ queryKey: tripBalancesQueryKey(expense.tripId) });
      queryClient.invalidateQueries({ queryKey: settlementSuggestionsQueryKey(expense.tripId) });
      queryClient.invalidateQueries({ queryKey: tripQueryKey(expense.tripId) });
      queryClient.invalidateQueries({ queryKey: tripsQueryKey(undefined).slice(0, 1) });

      if (tripId && tripId !== expense.tripId) {
        queryClient.invalidateQueries({ queryKey: expensesQueryKey(tripId) });
      }
    },
  });
}

export function useComputeTripBalancesMutation(tripId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!tripId) {
        throw new Error('Cannot compute balances without a trip id.');
      }

      return computeTripBalances(tripId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripBalancesQueryKey(tripId) });
      queryClient.invalidateQueries({ queryKey: settlementSuggestionsQueryKey(tripId) });
    },
  });
}

export function useMarkSettlementPaidMutation(tripId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: MarkSettlementPaidFormValues) => markSettlementPaid(values),
    onSuccess: (payment) => {
      queryClient.invalidateQueries({ queryKey: tripBalancesQueryKey(payment.tripId) });
      queryClient.invalidateQueries({ queryKey: settlementSuggestionsQueryKey(payment.tripId) });
      queryClient.invalidateQueries({ queryKey: settlementPaymentsQueryKey(payment.tripId) });

      if (tripId && tripId !== payment.tripId) {
        queryClient.invalidateQueries({ queryKey: settlementPaymentsQueryKey(tripId) });
      }
    },
  });
}
