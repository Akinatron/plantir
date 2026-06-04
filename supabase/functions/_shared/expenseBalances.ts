import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.107.0';

export type TripBalance = {
  memberId: string;
  currencyCode: string;
  balanceCents: number;
};

export type SettlementSuggestionRow = {
  id: string;
  trip_id: string;
  from_user_id: string;
  to_user_id: string;
  amount_cents: number;
  currency_code: string;
  computed_at: string;
};

type ExpenseRow = {
  id: string;
  amount_cents: number;
  currency_code: string;
  status: 'active' | 'voided';
};

type PayerRow = {
  expense_id: string;
  user_id: string;
  amount_cents: number;
};

type SplitRow = {
  expense_id: string;
  user_id: string;
  amount_cents: number;
};

type MemberRow = {
  user_id: string;
};

type PaidSettlementRow = {
  from_user_id: string;
  to_user_id: string;
  amount_cents: number;
  currency_code: string;
};

const suggestionSelect =
  'id, trip_id, from_user_id, to_user_id, amount_cents, currency_code, computed_at';

export async function computeAndPersistTripBalances(
  serviceClient: SupabaseClient,
  tripId: string,
): Promise<{ balances: TripBalance[]; settlements: SettlementSuggestionRow[] }> {
  const [members, expenses, payers, splits, paidSettlements] = await Promise.all([
    fetchMembers(serviceClient, tripId),
    fetchExpenses(serviceClient, tripId),
    fetchPayers(serviceClient, tripId),
    fetchSplits(serviceClient, tripId),
    fetchPaidSettlements(serviceClient, tripId),
  ]);
  const balances = computeBalances(members, expenses, payers, splits, paidSettlements);
  const suggestions = suggestSettlements(balances);
  const persisted = await persistSuggestions(serviceClient, tripId, suggestions);

  return {
    balances,
    settlements: persisted,
  };
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

async function fetchExpenses(serviceClient: SupabaseClient, tripId: string): Promise<ExpenseRow[]> {
  const { data, error } = await serviceClient
    .from('expenses')
    .select('id, amount_cents, currency_code, status')
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .returns<ExpenseRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function fetchPayers(serviceClient: SupabaseClient, tripId: string): Promise<PayerRow[]> {
  const { data, error } = await serviceClient
    .from('expense_payers')
    .select('expense_id, user_id, amount_cents, expenses!inner(trip_id)')
    .eq('expenses.trip_id', tripId)
    .returns<(PayerRow & { expenses: { trip_id: string } })[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(({ expenses: _expenses, ...row }) => row);
}

async function fetchSplits(serviceClient: SupabaseClient, tripId: string): Promise<SplitRow[]> {
  const { data, error } = await serviceClient
    .from('expense_splits')
    .select('expense_id, user_id, amount_cents, expenses!inner(trip_id)')
    .eq('expenses.trip_id', tripId)
    .returns<(SplitRow & { expenses: { trip_id: string } })[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(({ expenses: _expenses, ...row }) => row);
}

async function fetchPaidSettlements(serviceClient: SupabaseClient, tripId: string): Promise<PaidSettlementRow[]> {
  const { data, error } = await serviceClient
    .from('settlement_payments')
    .select('from_user_id, to_user_id, amount_cents, currency_code')
    .eq('trip_id', tripId)
    .eq('status', 'paid')
    .returns<PaidSettlementRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

function computeBalances(
  members: MemberRow[],
  expenses: ExpenseRow[],
  payers: PayerRow[],
  splits: SplitRow[],
  paidSettlements: PaidSettlementRow[],
): TripBalance[] {
  const balances = new Map<string, number>();
  const expensesById = new Map(expenses.filter((expense) => expense.status === 'active').map((expense) => [expense.id, expense]));

  for (const member of members) {
    balances.set(member.user_id, balances.get(member.user_id) ?? 0);
  }

  for (const payer of payers) {
    const expense = expensesById.get(payer.expense_id);

    if (expense) {
      addBalance(balances, payer.user_id, expense.currency_code, payer.amount_cents);
    }
  }

  for (const split of splits) {
    const expense = expensesById.get(split.expense_id);

    if (expense) {
      addBalance(balances, split.user_id, expense.currency_code, -split.amount_cents);
    }
  }

  for (const payment of paidSettlements) {
    addBalance(balances, payment.from_user_id, payment.currency_code, payment.amount_cents);
    addBalance(balances, payment.to_user_id, payment.currency_code, -payment.amount_cents);
  }

  return [...balances.entries()]
    .map(([key, balanceCents]) => {
      const [memberId = '', currencyCode = ''] = key.split(':');
      return { memberId, currencyCode, balanceCents };
    })
    .filter((balance) => balance.currencyCode.length > 0)
    .sort((left, right) => left.currencyCode.localeCompare(right.currencyCode) || left.memberId.localeCompare(right.memberId));
}

function suggestSettlements(balances: TripBalance[]) {
  const byCurrency = new Map<string, TripBalance[]>();

  for (const balance of balances) {
    byCurrency.set(balance.currencyCode, [...(byCurrency.get(balance.currencyCode) ?? []), balance]);
  }

  const suggestions: { from_user_id: string; to_user_id: string; amount_cents: number; currency_code: string }[] = [];

  for (const [currencyCode, currencyBalances] of byCurrency.entries()) {
    const debtors = currencyBalances
      .filter((balance) => balance.balanceCents < 0)
      .map((balance) => ({ memberId: balance.memberId, amountCents: -balance.balanceCents }))
      .sort((left, right) => right.amountCents - left.amountCents || left.memberId.localeCompare(right.memberId));
    const creditors = currencyBalances
      .filter((balance) => balance.balanceCents > 0)
      .map((balance) => ({ memberId: balance.memberId, amountCents: balance.balanceCents }))
      .sort((left, right) => right.amountCents - left.amountCents || left.memberId.localeCompare(right.memberId));
    let debtorIndex = 0;
    let creditorIndex = 0;

    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const debtor = debtors[debtorIndex];
      const creditor = creditors[creditorIndex];

      if (!debtor || !creditor) {
        break;
      }

      const amountCents = Math.min(debtor.amountCents, creditor.amountCents);

      if (amountCents > 0) {
        suggestions.push({
          from_user_id: debtor.memberId,
          to_user_id: creditor.memberId,
          amount_cents: amountCents,
          currency_code: currencyCode,
        });
      }

      debtor.amountCents -= amountCents;
      creditor.amountCents -= amountCents;

      if (debtor.amountCents === 0) {
        debtorIndex += 1;
      }

      if (creditor.amountCents === 0) {
        creditorIndex += 1;
      }
    }
  }

  return suggestions;
}

async function persistSuggestions(
  serviceClient: SupabaseClient,
  tripId: string,
  suggestions: { from_user_id: string; to_user_id: string; amount_cents: number; currency_code: string }[],
): Promise<SettlementSuggestionRow[]> {
  const { error: deleteError } = await serviceClient
    .from('settlement_suggestions')
    .delete()
    .eq('trip_id', tripId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (suggestions.length === 0) {
    return [];
  }

  const computedAt = new Date().toISOString();
  const { data, error } = await serviceClient
    .from('settlement_suggestions')
    .insert(
      suggestions.map((suggestion) => ({
        trip_id: tripId,
        ...suggestion,
        computed_at: computedAt,
      })),
    )
    .select(suggestionSelect)
    .returns<SettlementSuggestionRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

function addBalance(balances: Map<string, number>, memberId: string, currencyCode: string, deltaCents: number): void {
  const normalizedCurrency = currencyCode.toUpperCase();
  const key = `${memberId}:${normalizedCurrency}`;
  balances.set(key, (balances.get(key) ?? 0) + deltaCents);
}
