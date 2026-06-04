export type ExpenseStatus = 'active' | 'voided';
export type SettlementPaymentStatus = 'pending' | 'paid' | 'cancelled';

export type Expense = {
  id: string;
  tripId: string;
  createdBy: string;
  title: string;
  description: string | null;
  category: string | null;
  amountCents: number;
  currencyCode: string;
  expenseDate: string;
  status: ExpenseStatus;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseRow = {
  id: string;
  trip_id: string;
  created_by: string;
  title: string;
  description: string | null;
  category: string | null;
  amount_cents: number;
  currency_code: string;
  expense_date: string;
  status: ExpenseStatus;
  created_at: string;
  updated_at: string;
};

export type ExpensePayer = {
  id: string;
  expenseId: string;
  userId: string;
  amountCents: number;
};

export type ExpensePayerRow = {
  id: string;
  expense_id: string;
  user_id: string;
  amount_cents: number;
};

export type ExpenseSplit = {
  id: string;
  expenseId: string;
  userId: string;
  amountCents: number;
};

export type ExpenseSplitRow = {
  id: string;
  expense_id: string;
  user_id: string;
  amount_cents: number;
};

export type ExpenseDetail = {
  expense: Expense;
  payers: ExpensePayer[];
  splits: ExpenseSplit[];
};

export type TripBalance = {
  memberId: string;
  currencyCode: string;
  balanceCents: number;
};

export type SettlementSuggestion = {
  id: string;
  tripId: string;
  fromUserId: string;
  toUserId: string;
  amountCents: number;
  currencyCode: string;
  computedAt: string;
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

export type SettlementPayment = {
  id: string;
  tripId: string;
  suggestionId: string | null;
  fromUserId: string;
  toUserId: string;
  amountCents: number;
  currencyCode: string;
  status: SettlementPaymentStatus;
  markedPaidBy: string | null;
  paidAt: string | null;
};

export type SettlementPaymentRow = {
  id: string;
  trip_id: string;
  suggestion_id: string | null;
  from_user_id: string;
  to_user_id: string;
  amount_cents: number;
  currency_code: string;
  status: SettlementPaymentStatus;
  marked_paid_by: string | null;
  paid_at: string | null;
};

export type ComputeTripBalancesResult = {
  balances: TripBalance[];
  settlements: SettlementSuggestion[];
};

export function mapExpenseRow(row: ExpenseRow): Expense {
  return {
    id: row.id,
    tripId: row.trip_id,
    createdBy: row.created_by,
    title: row.title,
    description: row.description,
    category: row.category,
    amountCents: row.amount_cents,
    currencyCode: row.currency_code,
    expenseDate: row.expense_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapExpensePayerRow(row: ExpensePayerRow): ExpensePayer {
  return {
    id: row.id,
    expenseId: row.expense_id,
    userId: row.user_id,
    amountCents: row.amount_cents,
  };
}

export function mapExpenseSplitRow(row: ExpenseSplitRow): ExpenseSplit {
  return {
    id: row.id,
    expenseId: row.expense_id,
    userId: row.user_id,
    amountCents: row.amount_cents,
  };
}

export function mapSettlementSuggestionRow(row: SettlementSuggestionRow): SettlementSuggestion {
  return {
    id: row.id,
    tripId: row.trip_id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    amountCents: row.amount_cents,
    currencyCode: row.currency_code,
    computedAt: row.computed_at,
  };
}

export function mapSettlementPaymentRow(row: SettlementPaymentRow): SettlementPayment {
  return {
    id: row.id,
    tripId: row.trip_id,
    suggestionId: row.suggestion_id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    amountCents: row.amount_cents,
    currencyCode: row.currency_code,
    status: row.status,
    markedPaidBy: row.marked_paid_by,
    paidAt: row.paid_at,
  };
}
