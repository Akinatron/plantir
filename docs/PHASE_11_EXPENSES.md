# Phase 11: Expenses, Balances, and Settlements

## Implemented Scope

- Expenses list screen.
- Create expense screen.
- Expense detail screen.
- Balances screen.
- Settlements screen.
- MVP expense fields:
  - title
  - description
  - category
  - amount as integer cents
  - currency
  - paid by
  - split equally
  - exclude people
  - paid date
- Edge Functions:
  - `compute-trip-balances`
  - `mark-settlement-paid`
- Persisted optimized settlement suggestions in `settlement_suggestions`.
- Paid settlement records in `settlement_payments`.
- Activity log entries:
  - `trip_balances_computed`
  - `settlement_payment_marked_paid`

## Design Decisions

- Decision: MVP UI supports equal split with exclusions only.
- Reason: It covers the core group-trip workflow and keeps create-expense UX reliable.
- Alternatives: Exact amounts, percentages, shares, multiple payers.
- Risk: Some real trips need advanced splitting.
- Mitigation: Phase 6 algorithms already support exact, percentages, shares, multiple payers, income, and refunds. UI can expand later without changing core math.

- Decision: Balance computation runs in an Edge Function.
- Reason: It can read all expense rows, paid settlements, regenerate suggestions, and write activity with the service role while keeping client permissions simple.
- Alternatives: Compute only in the client.
- Risk: Edge Function code duplicates part of the pure algorithm behavior.
- Mitigation: Local pure algorithm tests cover the expected math; Edge Function uses the same payer/split balance model.

## Settlement Behavior

- Original expenses, payer rows, and split rows are never deleted when a settlement is marked paid.
- `mark-settlement-paid` inserts a `settlement_payments` row with `status = paid`.
- Completed settlement payments are included in future balance computation.
- Settlement suggestions can be regenerated because they are derived data.
- If a suggestion is deleted during regeneration, existing payment history remains because `settlement_payments.suggestion_id` uses `on delete set null`.

## Edge Function Contracts

### `compute-trip-balances`

Request:

```json
{
  "tripId": "uuid"
}
```

Behavior:

- Requires authenticated trip membership.
- Reads joined members, active expenses, payer rows, split rows, and paid settlement payments.
- Computes current balances by currency.
- Deletes and regenerates optimized settlement suggestions.
- Writes `activity_log.trip_balances_computed`.

### `mark-settlement-paid`

Request:

```json
{
  "suggestionId": "uuid"
}
```

Behavior:

- Requires authenticated trip membership.
- Requires actor to be the payer, receiver, or trip admin.
- Inserts a paid `settlement_payments` row.
- Recomputes balances and settlement suggestions.
- Writes `activity_log.settlement_payment_marked_paid`.

## RLS and Permission Checks

Existing RLS policies cover:

1. Members can read expenses for their trips.
2. Members can create expenses only if trip settings allow it or they are admin/owner.
3. Expense creator/admin can manage expense headers, payers, and splits.
4. Members can read settlement suggestions and settlement payments.
5. Settlement payment writes are handled by Edge Functions with service role.
6. Activity log direct writes remain blocked from the client.

Manual staging checks:

1. External user cannot read expenses, payers, splits, suggestions, or payments.
2. Member can create an expense when `member_can_create_expenses = true`.
3. Member cannot create an expense when trip setting disables member expense creation.
4. Balance computation includes paid settlement payments.
5. Marking a settlement paid creates a payment record and does not delete expenses.
6. Non-participant/non-admin cannot mark another settlement as paid.

## MVP Limitations

- UI supports one payer per expense.
- UI supports equal split with exclusions only.
- Advanced splits remain V1 UI work, although the pure algorithm already supports them.
- Expense editing, voiding, receipt uploads, and category presets are not implemented yet.
- Real payment processing is out of scope.
