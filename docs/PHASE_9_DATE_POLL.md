# Phase 9: Date Poll Module

## Implemented Scope

- Date poll setup screen for owners/admins.
- Date poll vote screen for joined members.
- Date poll results screen.
- Basic admin configuration:
  - one allowed date range
  - minimum trip days
  - maximum trip days
  - optional preferred duration
  - optional voting deadline
  - optional required members
- Member voting with explicit statuses:
  - `preferred`
  - `available`
  - `maybe`
  - `unavailable`
- `compute-date-poll-results` Edge Function.
- `close-date-poll` Edge Function.
- Result persistence in `date_poll_results`.
- Closing a poll saves:
  - `polls.status = closed`
  - `polls.closed_at`
  - `trips.starts_on`
  - `trips.ends_on`
  - `trips.final_date_poll_result_id`
  - `trips.status = date_decided`
- Activity log entry:
  - `date_poll_closed`

## Product Decision

- Decision: Admins close the date poll, but they do not manually choose the winning date.
- Reason: The approved PRD decision requires the app to always determine the winning date range automatically using deterministic ranking.
- Alternatives: Let admins manually choose from tied results.
- Risk: Users may expect an override if the top date is socially inconvenient.
- Mitigation: A later phase can add an explicit reopen/reactivate workflow. Silent result overrides remain out of scope.

## Database Changes

Migration: `20260603183000_date_poll_mvp.sql`

Adds:

- `date_availability_status` enum.
- `polls.min_trip_days`.
- `polls.max_trip_days`.
- `polls.voting_deadline_at`.
- `date_availability_votes.status`.
- `date_poll_required_members`.
- richer result count fields and `rank_reason` on `date_poll_results`.

## Edge Function Contracts

### `compute-date-poll-results`

Request:

```json
{
  "pollId": "uuid"
}
```

Behavior:

- Requires authenticated owner/admin.
- Reads allowed ranges, joined members, required members, and vote rows.
- Runs the pure deterministic date poll ranking logic.
- Deletes prior result rows for the poll.
- Persists the top ranked candidates, with rank `1` marked as winner.
- Does not close the poll.

### `close-date-poll`

Request:

```json
{
  "pollId": "uuid"
}
```

Behavior:

- Requires authenticated owner/admin.
- Recomputes and persists results before closing.
- Saves the rank `1` result as the trip final date.
- Closes the poll.
- Moves the trip to `date_decided`.
- Writes `activity_log.date_poll_closed`.

## RLS and Permission Checks

Manual staging checks:

1. External user cannot read date poll rows.
   - Expected: no rows from `polls`, `date_poll_allowed_ranges`, `date_availability_votes`, `date_poll_results`.

2. Joined member can read active date poll configuration.
   - Expected: member can load setup metadata needed for voting.

3. Joined member can write only their own votes.
   - Expected: insert/update/delete succeeds only when `user_id = auth.uid()`.

4. Joined member cannot compute or close results.
   - Expected: Edge Functions return `403`.

5. Owner/admin can compute results.
   - Expected: `date_poll_results` rows are replaced and rank `1` is marked winner.

6. Owner/admin can close poll.
   - Expected: poll is closed, trip dates are saved, trip status is `date_decided`, and activity log row exists.

7. Closed poll blocks new votes through RLS.
   - Expected: `can_vote_poll` returns false because poll status is no longer active/reopened.

## MVP Limitations

- Setup supports one allowed range. The schema and algorithm support multiple ranges, but the MVP screen keeps setup simple.
- Results screen allows owners/admins to recompute results before closing; role-based hiding of admin controls in the UI is not complete yet, so the Edge Function remains the source of truth.
- Notifications are not sent yet. The close function creates activity only; member notification delivery is reserved for the notification module.
- Poll setup currently writes from the client using existing RLS. If setup needs stronger transactional guarantees later, move setup into an Edge Function.
- The Edge Function keeps its own Deno-compatible copy of the pure date poll ranking logic because Supabase Functions deploy from the functions tree.
