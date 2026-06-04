import { buildExpenseSplits } from '../lib/algorithms/expenses';
import { getSupabaseClient } from '../lib/supabase/client';
import { logTripActivity, sendTripNotification } from './notificationService';
import {
  MarkSettlementPaidFormValues,
  ParsedCreateExpenseFormValues,
  markSettlementPaidSchema,
} from '../lib/validation/expense';
import {
  ComputeTripBalancesResult,
  Expense,
  ExpenseDetail,
  ExpensePayerRow,
  ExpenseRow,
  ExpenseSplitRow,
  SettlementPayment,
  SettlementPaymentRow,
  SettlementSuggestion,
  SettlementSuggestionRow,
  mapExpensePayerRow,
  mapExpenseRow,
  mapExpenseSplitRow,
  mapSettlementPaymentRow,
  mapSettlementSuggestionRow,
} from '../types/expense';

const expenseSelect =
  'id, trip_id, created_by, title, description, category, amount_cents, currency_code, expense_date, status, created_at, updated_at';
const payerSelect = 'id, expense_id, user_id, amount_cents';
const splitSelect = 'id, expense_id, user_id, amount_cents';
const suggestionSelect =
  'id, trip_id, from_user_id, to_user_id, amount_cents, currency_code, computed_at';
const paymentSelect =
  'id, trip_id, suggestion_id, from_user_id, to_user_id, amount_cents, currency_code, status, marked_paid_by, paid_at';

export async function listExpenses(tripId: string): Promise<Expense[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('expenses')
    .select(expenseSelect)
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })
    .returns<ExpenseRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapExpenseRow);
}

export async function getExpenseDetail(expenseId: string): Promise<ExpenseDetail | null> {
  const supabase = getSupabaseClient();
  const { data: expenseRow, error: expenseError } = await supabase
    .from('expenses')
    .select(expenseSelect)
    .eq('id', expenseId)
    .is('deleted_at', null)
    .maybeSingle<ExpenseRow>();

  if (expenseError) {
    throw new Error(expenseError.message);
  }

  if (!expenseRow) {
    return null;
  }

  const [payers, splits] = await Promise.all([listExpensePayers(expenseId), listExpenseSplits(expenseId)]);

  return {
    expense: mapExpenseRow(expenseRow),
    payers,
    splits,
  };
}

export async function createExpense(values: ParsedCreateExpenseFormValues): Promise<Expense> {
  const supabase = getSupabaseClient();
  const { data: expenseRow, error: expenseError } = await supabase
    .from('expenses')
    .insert({
      trip_id: values.tripId,
      created_by: values.createdBy,
      title: values.title,
      description: values.description?.trim() || null,
      category: values.category?.trim() || null,
      amount_cents: values.amountCents,
      currency_code: values.currencyCode,
      expense_date: values.expenseDate,
    })
    .select(expenseSelect)
    .single<ExpenseRow>();

  if (expenseError) {
    throw new Error(expenseError.message);
  }

  const splits = buildExpenseSplits({
    id: expenseRow.id,
    kind: 'expense',
    amountCents: values.amountCents,
    currencyCode: values.currencyCode,
    payers: [{ memberId: values.paidByUserId, amountCents: values.amountCents }],
    split: {
      type: 'equal',
      participantIds: values.participantIds,
      excludedMemberIds: values.excludedUserIds,
    },
  });

  const { error: payerError } = await supabase.from('expense_payers').insert({
    expense_id: expenseRow.id,
    user_id: values.paidByUserId,
    amount_cents: values.amountCents,
  });

  if (payerError) {
    throw new Error(payerError.message);
  }

  const { error: splitError } = await supabase.from('expense_splits').insert(
    splits.map((split) => ({
      expense_id: expenseRow.id,
      user_id: split.memberId,
      amount_cents: split.amountCents,
    })),
  );

  if (splitError) {
    throw new Error(splitError.message);
  }

  await logNonBlocking(() =>
    logTripActivity({
      tripId: expenseRow.trip_id,
      eventType: 'expense_created',
      metadata: {
        expense_id: expenseRow.id,
        title: expenseRow.title,
        amount_cents: expenseRow.amount_cents,
        currency_code: expenseRow.currency_code,
      },
    }),
  );
  await logNonBlocking(() =>
    sendTripNotification({
      tripId: expenseRow.trip_id,
      eventType: 'new_expense',
      title: 'New expense',
      body: expenseRow.title,
      metadata: {
        expense_id: expenseRow.id,
        amount_cents: expenseRow.amount_cents,
        currency_code: expenseRow.currency_code,
      },
    }),
  );

  return mapExpenseRow(expenseRow);
}

export async function computeTripBalances(tripId: string): Promise<ComputeTripBalancesResult> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke<{
    balances: ComputeTripBalancesResult['balances'];
    settlements: SettlementSuggestionRow[];
  }>('compute-trip-balances', {
    body: { tripId },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Balance function returned no data.');
  }

  return {
    balances: data.balances,
    settlements: data.settlements.map(mapSettlementSuggestionRow),
  };
}

export async function listSettlementSuggestions(tripId: string): Promise<SettlementSuggestion[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('settlement_suggestions')
    .select(suggestionSelect)
    .eq('trip_id', tripId)
    .order('currency_code', { ascending: true })
    .order('amount_cents', { ascending: false })
    .returns<SettlementSuggestionRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapSettlementSuggestionRow);
}

export async function listSettlementPayments(tripId: string): Promise<SettlementPayment[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('settlement_payments')
    .select(paymentSelect)
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .returns<SettlementPaymentRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapSettlementPaymentRow);
}

export async function markSettlementPaid(values: MarkSettlementPaidFormValues): Promise<SettlementPayment> {
  const parsed = markSettlementPaidSchema.parse(values);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke<{
    payment: SettlementPaymentRow;
  }>('mark-settlement-paid', {
    body: parsed,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Settlement payment function returned no data.');
  }

  const payment = mapSettlementPaymentRow(data.payment);
  await logNonBlocking(() =>
    sendTripNotification({
      tripId: payment.tripId,
      eventType: 'settlement_marked_paid',
      title: 'Settlement marked paid',
      body: `${payment.currencyCode} ${payment.amountCents} was marked paid.`,
      targetUserIds: [payment.fromUserId, payment.toUserId],
      metadata: {
        payment_id: payment.id,
        suggestion_id: payment.suggestionId,
        amount_cents: payment.amountCents,
        currency_code: payment.currencyCode,
      },
    }),
  );

  return payment;
}

async function logNonBlocking(work: () => Promise<void>): Promise<void> {
  try {
    await work();
  } catch {
    // Activity and notifications should not undo the primary user action.
  }
}

async function listExpensePayers(expenseId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('expense_payers')
    .select(payerSelect)
    .eq('expense_id', expenseId)
    .returns<ExpensePayerRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapExpensePayerRow);
}

async function listExpenseSplits(expenseId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('expense_splits')
    .select(splitSelect)
    .eq('expense_id', expenseId)
    .returns<ExpenseSplitRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapExpenseSplitRow);
}
