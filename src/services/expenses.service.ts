/**
 * Servicio de gastos.
 *
 * Las queries son "planas" (lee expenses, payers, splits y los calcula
 * en cliente con los algoritmos puros). Para el cálculo oficial server-side,
 * existe la Edge Function `compute-trip-balances`.
 */

import { supabase } from '@/lib/supabase/client';
import { ok, fail, fromSupabaseError } from '@/lib/service-result';
import type { ServiceResult } from '@/lib/service-result';
import type { Expense, ExpenseId, ExpensePayer, ExpenseSplit, TripId, CreateExpenseInput } from '@/types';

interface ExpenseFull extends Expense {
  payers: ExpensePayer[];
  splits: ExpenseSplit[];
}

export const expensesService = {
  async listForTrip(tripId: TripId): Promise<ServiceResult<ExpenseFull[]>> {
    // Hacemos 3 queries: expenses + payers + splits, y las joineamos en cliente.
    const [expensesRes, payersRes, splitsRes] = await Promise.all([
      supabase
        .from('expenses')
        .select('*')
        .eq('trip_id', tripId)
        .is('deleted_at', null)
        .order('paid_at', { ascending: false }),
      supabase
        .from('expense_payers')
        .select('*, expense:expenses!inner(trip_id)')
        .eq('expense.trip_id', tripId),
      supabase
        .from('expense_splits')
        .select('*, expense:expenses!inner(trip_id)')
        .eq('expense.trip_id', tripId),
    ]);
    if (expensesRes.error) return fail(fromSupabaseError(expensesRes.error));
    if (payersRes.error) return fail(fromSupabaseError(payersRes.error));
    if (splitsRes.error) return fail(fromSupabaseError(splitsRes.error));

    const payersByExpense = new Map<string, ExpensePayer[]>();
    for (const p of payersRes.data ?? []) {
      const arr = payersByExpense.get(p.expense_id) ?? [];
      arr.push(p as unknown as ExpensePayer);
      payersByExpense.set(p.expense_id, arr);
    }
    const splitsByExpense = new Map<string, ExpenseSplit[]>();
    for (const s of splitsRes.data ?? []) {
      const arr = splitsByExpense.get(s.expense_id) ?? [];
      arr.push(s as unknown as ExpenseSplit);
      splitsByExpense.set(s.expense_id, arr);
    }
    const full: ExpenseFull[] = (expensesRes.data ?? []).map((e) => ({
      ...(e as unknown as Expense),
      payers: payersByExpense.get(e.id) ?? [],
      splits: splitsByExpense.get(e.id) ?? [],
    }));
    return ok(full);
  },

  async getById(expenseId: ExpenseId): Promise<ServiceResult<ExpenseFull>> {
    const { data: expense, error: e1 } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .maybeSingle();
    if (e1) return fail(fromSupabaseError(e1));
    if (!expense) return fail({ code: 'not_found', message: 'Gasto no encontrado' });

    const [payersRes, splitsRes] = await Promise.all([
      supabase.from('expense_payers').select('*').eq('expense_id', expenseId),
      supabase.from('expense_splits').select('*').eq('expense_id', expenseId),
    ]);
    if (payersRes.error) return fail(fromSupabaseError(payersRes.error));
    if (splitsRes.error) return fail(fromSupabaseError(splitsRes.error));
    return ok({
      ...(expense as unknown as Expense),
      payers: (payersRes.data ?? []) as unknown as ExpensePayer[],
      splits: (splitsRes.data ?? []) as unknown as ExpenseSplit[],
    });
  },

  async create(input: CreateExpenseInput): Promise<ServiceResult<ExpenseFull>> {
    // 1) Insert expense
    const { data: expense, error: e1 } = await supabase
      .from('expenses')
      .insert({
        trip_id: input.tripId,
        title: input.title,
        description: input.description ?? null,
        category: input.category,
        type: input.type,
        amount_cents: input.amountCents,
        currency: input.currency,
        paid_at: input.paidAt ?? new Date().toISOString().slice(0, 10),
        receipt_storage_path: input.receiptStoragePath ?? null,
      })
      .select()
      .single();
    if (e1) return fail(fromSupabaseError(e1));
    const expenseId = expense.id;

    // 2) Insert payers
    const { error: e2 } = await supabase
      .from('expense_payers')
      .insert(
        input.payers.map((p) => ({
          expense_id: expenseId,
          member_id: p.memberId,
          amount_cents: p.amountCents,
        })),
      );
    if (e2) return fail(fromSupabaseError(e2));

    // 3) Insert splits
    const { error: e3 } = await supabase
      .from('expense_splits')
      .insert(
        input.splits.map((s) => ({
          expense_id: expenseId,
          member_id: s.memberId,
          split_type: s.splitType,
          amount_cents: s.amountCents ?? null,
          percentage: s.percentage ?? null,
          shares: s.shares ?? null,
          included: s.included,
        })),
      );
    if (e3) return fail(fromSupabaseError(e3));

    return ok({
      ...(expense as unknown as Expense),
      payers: input.payers as unknown as ExpensePayer[],
      splits: input.splits as unknown as ExpenseSplit[],
    });
  },

  async delete(expenseId: ExpenseId): Promise<ServiceResult<null>> {
    const { error } = await supabase
      .from('expenses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', expenseId);
    if (error) return fail(fromSupabaseError(error));
    return ok(null);
  },

  /**
   * Recalcula balances y settlements server-side via Edge Function.
   */
  async recomputeBalances(tripId: TripId): Promise<ServiceResult<{ balances: unknown; settlements: unknown }>> {
    const { data, error } = await supabase.functions.invoke('compute-trip-balances', {
      body: { tripId },
    });
    if (error) return fail(fromSupabaseError(error));
    return ok(data as { balances: unknown; settlements: unknown });
  },
};
