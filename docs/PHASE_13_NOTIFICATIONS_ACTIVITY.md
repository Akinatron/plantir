# Phase 13: Notifications and Activity Log

## Implemented scope

- In-app notifications tab with unread/read/dismiss flows.
- MVP notification preferences:
  - in-app enabled
  - push enabled
  - muted event type list in the database for later UI expansion
- Expo push token registration with `expo-notifications`.
- `push_tokens` integration.
- `notifications` integration.
- Trip activity screen backed by `activity_log`.
- Activity service for reading activity and controlled event logging.
- Edge Functions:
  - `send-trip-notification`
  - `log-trip-activity`

## Activity events

Implemented or normalized:

- `trip_created`
- `member_joined`
- `date_poll_created`
- `date_vote_submitted`
- `date_chosen`
- `destination_proposal_created`
- `destination_vote_submitted`
- `destination_chosen`
- `expense_created`
- `settlement_marked_paid`
- `task_created`
- `task_completed`

Some older Edge Function event names are still mapped in the UI for compatibility with existing local data.

## Notification events

Implemented notification delivery for:

- `member_joined`
- `date_chosen`
- `new_proposal`
- `place_chosen`
- `new_expense`
- `settlement_marked_paid`
- `task_assigned`

The `send-trip-notification` function also supports `invited_to_trip`, but the MVP invite-link flow does not target a known user account at invite creation time. Email notifications remain out of MVP.

## Privacy and over-notification rules

- Only authenticated trip members can call trip notification delivery.
- Recipients are restricted to joined trip members.
- The actor is excluded by default.
- Per-user notification preferences are checked before creating in-app notifications or sending push.
- Muted event types are respected by the Edge Function.
- Votes are logged to activity but do not notify members.
- Activity logging and notification sending are non-blocking after the primary write succeeds.

## Push delivery

- Device push tokens are stored in `push_tokens`.
- Tokens are upserted by token value and marked active with `revoked_at = null`.
- Push delivery uses Expo Push API from the Edge Function.
- Service role stays server-side only.

## MVP limitations

- No email notifications.
- No rich per-event preference UI yet; the database supports muted event types.
- No background notification listener behavior beyond token registration.
- No push receipt reconciliation yet.
- Invite notifications are only possible when a known user target exists.
