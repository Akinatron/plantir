# Frontend Redesign: Product Contract and Backend Gap List

This document locks the product/backend contract for the frontend redesign. It describes what already exists, what the new UI needs, and which backend changes are required before those UI controls can be real.

## Current Scope That Already Exists

The current project already has real Supabase-backed implementation for:

- Auth: email/password, magic link plumbing, session provider.
- Profiles: display name, avatar, locale, default currency, timezone.
- Trips: creation, list, dashboard, basic settings.
- Members: membership list and roles.
- Invites: token creation, expiration, max uses, revoke, accept flow.
- Date poll: poll setup, availability votes, computed results, close poll.
- Destination poll: proposal creation, image upload, single-choice vote, computed results, close poll.
- Expenses: equal split with exclusions, integer-cent amounts, payers/splits.
- Balances: computed trip balances.
- Settlements: optimized suggestions and mark-paid Edge Function.
- Activity log: important trip events.
- Notifications: in-app notification records and push token integration.

## Current Backend Model Summary

### Trips

Current trip statuses are internal workflow statuses:

- `group_created`
- `voting_dates`
- `date_decided`
- `voting_place`
- `place_decided`
- `planning`
- `on_trip`
- `settling_expenses`
- `closed`

Current trip-level member permissions:

- `member_can_create_proposals`
- `member_can_create_expenses`

Current trip result columns:

- `starts_on`
- `ends_on`
- `final_date_poll_result_id`
- `final_destination_proposal_id`
- `selected_destination_proposal_id`
- `selected_destination_snapshot`

### Date Poll

Current date poll data:

- Allowed ranges are stored in `date_poll_allowed_ranges`.
- Day-level votes are stored in `date_availability_votes`.
- Computed ranked ranges are stored in `date_poll_results`.
- The result table stores aggregate counts, not per-result member lists.

Important mismatch:

- Initial schema comment says only available days are stored.
- Later migration adds explicit statuses: `preferred`, `available`, `maybe`, `unavailable`.
- The new UI should only expose available-day selection. It should not ask users to manually mark unavailable days.

### Destination Poll

Current proposal fields:

- `title`
- `description`
- `url`
- `location_text`
- `estimated_price_cents`
- `currency_code`
- `price_per_person_cents`
- `capacity`
- `bedrooms`
- `bathrooms`
- `pros`
- `cons`

Current storage:

- Proposal images are stored in `destination_proposal_images` and Supabase Storage.

Important mismatch:

- New UI does not want `price_per_person`, `pros`, or `cons` as visible default fields.
- Current backend does not have persistent custom fields for place proposals.

### Money

Current money model:

- Expenses store integer cents.
- Expense payers/splits are normalized tables.
- Settlement suggestions are stored separately from settlement payments.
- Settlement payments track `marked_paid_by` and `paid_at`.

Important mismatch:

- Current backend does not store a trip-level setting for who can mark settlements paid.

## New UI Product Contract

### Visible Trip Statuses

The UI should show user-friendly statuses:

- `Planning trip`
- `Trip planned`
- `Trip confirmed`
- `Closed`

These are not the same as the current internal `trip_status` enum.

Recommended mapping for the first redesign pass:

| Internal status | UI status |
| --- | --- |
| `group_created` | `Planning trip` |
| `voting_dates` | `Planning trip` |
| `date_decided` | `Planning trip` |
| `voting_place` | `Planning trip` |
| `place_decided` | `Trip planned` |
| `planning` | `Trip planned` |
| `on_trip` | `Trip confirmed` |
| `settling_expenses` | `Trip confirmed` |
| `closed` | `Closed` |

Required backend gap:

- Add explicit manual confirmation support so `Trip confirmed` does not depend only on inferred internal status.

Recommended columns:

- `confirmed_at timestamptz`
- `confirmed_by uuid references public.profiles(id)`

Decision:
- Keep internal workflow statuses for backend logic, but expose simplified statuses in UI.

Reason:
- Users should see human-friendly trip state, while backend can keep workflow-specific states.

Alternatives:
- Replace the existing enum entirely.
- Add a second public enum.

Risk:
- Two status concepts can drift.

Mitigation:
- Centralize status mapping in one frontend helper and add backend confirmation columns for the manual final state.

## Backend Gaps Required For New UI

### Gap 1: Manual Trip Confirmation

Need:

- Owner/admin can manually confirm a trip.
- Confirmation should be persisted.
- UI should show `Trip confirmed` only after confirmation, unless the trip is closed.

Backend changes:

- Add `confirmed_at`.
- Add `confirmed_by`.
- Add service function/mutation for confirm trip.
- Ensure only owner/admin can confirm.
- Activity log event: `trip_confirmed`.

Acceptance:

- Member cannot confirm trip.
- Owner/admin can confirm trip.
- Closed trip remains read-only.
- Confirmation survives reload.

### Gap 2: Date Result Visibility Setting

Need:

- Owner/admin can decide whether members can see date poll results.
- Admin/owner can always see results.
- Members may need to vote before seeing results.

Backend changes:

- Add `member_can_see_date_results boolean not null default true` to `trips`.
- Update trip settings schema/type/service.
- Optionally tighten RLS for `date_poll_results`.

Important note:

- If RLS allows members to select results regardless of this setting, hiding results only in UI is not a security boundary.
- For MVP UI privacy, frontend hiding may be enough.
- For stronger privacy, RLS or an Edge Function must enforce visibility.

Acceptance:

- Admin/owner sees date results.
- Member sees date results only when setting allows.
- UI displays a locked/hidden state when not allowed.

### Gap 3: Place Result Visibility Setting

Need:

- Owner/admin can decide whether members can see place ranking/vote results.
- Admin/owner can always see results.

Backend changes:

- Add `member_can_see_place_results boolean not null default true` to `trips`.
- Update trip settings schema/type/service.
- Optionally tighten RLS for `destination_poll_results` and/or vote counts.

Acceptance:

- Admin/owner sees place ranking.
- Member sees place ranking only when setting allows.
- Member can still vote even if results are hidden.

### Gap 4: Custom Place Fields Permission

Need:

- Owner/admin decides whether members can modify/customize place fields.
- If disabled, members fill only configured/default fields.
- If enabled, members can add/edit custom fields according to the product rules.

Backend changes:

- Add `member_can_modify_place_fields boolean not null default false` to `trips`.
- Add custom field tables described below.
- Add RLS helper/policies for field management.
- Update settings schema/type/service.

Acceptance:

- Owner/admin can manage custom fields.
- Members can manage custom fields only when setting allows.
- Closed trips block changes.

### Gap 5: Settlement Mark-Paid Permission

Need:

- Owner/admin decides who can mark settlements as paid.

Policy options:

- `owner_admin_only`
- `participants`

Backend changes:

- Add enum `settlement_mark_paid_policy`.
- Add `settlement_mark_paid_policy public.settlement_mark_paid_policy not null default 'participants'` to `trips`.
- Update `mark-settlement-paid` Edge Function to enforce this.
- Update trip settings schema/type/service.

Acceptance:

- If policy is `owner_admin_only`, members cannot mark settlements paid.
- If policy is `participants`, payer/receiver can mark their own settlement paid.
- Owner/admin can always mark paid while trip is writable.

### Gap 6: Persistent Custom Fields For Places

Need:

- Custom fields must be persisted and comparable.
- A place card can show only fields marked visible on card.
- Detail screen can show all fields.

Recommended tables:

```sql
create type public.destination_custom_field_type as enum (
  'text',
  'number',
  'money',
  'boolean',
  'url'
);

create table public.destination_custom_fields (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  poll_id uuid references public.polls(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  emoji text,
  field_type public.destination_custom_field_type not null,
  show_on_card boolean not null default false,
  required boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint destination_custom_fields_name_not_blank check (length(btrim(name)) > 0),
  constraint destination_custom_fields_sort_non_negative check (sort_order >= 0)
);

create table public.destination_custom_field_values (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.destination_proposals(id) on delete cascade,
  field_id uuid not null references public.destination_custom_fields(id) on delete cascade,
  value_text text,
  value_number numeric,
  value_money_cents integer,
  value_boolean boolean,
  value_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (proposal_id, field_id),
  constraint destination_custom_field_values_money_non_negative check (
    value_money_cents is null or value_money_cents >= 0
  )
);
```

Required service/hook additions:

- `listDestinationCustomFields(tripId, pollId?)`
- `createDestinationCustomField(values)`
- `updateDestinationCustomField(values)`
- `deleteDestinationCustomField(fieldId)`
- `listDestinationCustomFieldValues(proposalId)`
- `upsertDestinationCustomFieldValues(proposalId, values)`

Acceptance:

- Fields are visible to trip members.
- Values are visible with proposals.
- `show_on_card` controls card preview.
- Required fields validate before saving proposal.
- Closed trip blocks field/value changes.

### Gap 7: Date Result Member Detail

Need:

- When tapping a ranked date range, UI shows:
  - Members counted for this range.
  - Members not counted for this range.
  - Members with no answer yet.

Backend options:

Option A: frontend derives details from members + day-level votes.

- No migration needed.
- More client-side logic.

Option B: Edge Function returns detailed buckets for a selected result.

- Cleaner frontend.
- More backend work.

Recommended for redesign:

- Use Option A first, because the required raw data already exists.

Acceptance:

- User is never shown a manual "unavailable" action.
- Label uses neutral wording: `Not counted for this range`, not `Unavailable`.

## Frontend Mapping Requirements

### Hidden Existing Fields

The new Places UI should not show these as default fields:

- `price_per_person_cents`
- `pros`
- `cons`

They can remain in the backend for backward compatibility and be sent as null/empty.

### Date Vote UI

The frontend should save selected available days/ranges as `available` votes. It should not expose:

- `preferred`
- `maybe`
- `unavailable`

Those statuses can remain in the backend/algorithm for future versions.

### Dashboard Preview

Dashboard top previews should use:

- Date poll results from `date_poll_results`.
- Destination ranking from `destination_poll_results` when computed, or proposal vote counts if results are not yet computed.

Visibility rules should respect the new settings once implemented.

## Implementation Order Recommendation

1. Add backend settings and confirmation columns.
2. Add frontend types, validation, and services for new settings.
3. Add custom field tables, RLS, services, hooks.
4. Update Edge Function permission for settlement mark-paid.
5. Build the new frontend design system.
6. Replace screens while keeping real hooks and services.

## Non-Goals For This Phase

- Do not redesign UI in this phase.
- Do not change migrations in this phase.
- Do not remove existing columns.
- Do not remove current screens.
- Do not convert either ZIP into project code.

## Open Decisions

1. Should hidden result settings be enforced only in UI for MVP, or also at RLS/Edge Function level?

Recommendation:
- Enforce in backend for data privacy once the setting exists.

2. Should members be able to add global custom fields for the whole place poll, or only custom fields attached to their proposal?

Current product direction:
- Owner/admin controls whether members can modify place fields.
- If enabled, member-created fields should still become shared fields for the trip/place poll so proposals remain comparable.

3. Should `Trip confirmed` be represented by new columns or a new enum value?

Recommendation:
- Use `confirmed_at` and `confirmed_by`, not a new enum value. It avoids risky enum rewrites and works cleanly with existing workflow statuses.
