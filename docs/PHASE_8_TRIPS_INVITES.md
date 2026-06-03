# Phase 8: Trips, Members, and Invitations

## Implemented Scope

- Trip list, trip creation, trip dashboard, members, invite management, and basic settings screens.
- Public invitation route at `/invite/[token]`.
- Auth-aware join flow:
  - Logged-out users see an invitation screen and are sent to login/signup with a `next` redirect.
  - Logged-in users accept the invite automatically.
  - Successful joins redirect to the trip dashboard.
- Supabase services and TanStack Query hooks for trips, members, invite creation, invite revocation, and invite acceptance.
- Edge Functions:
  - `create-trip-invite`
  - `accept-trip-invite`
- Invite token security:
  - Raw token is generated with secure random bytes.
  - Only a SHA-256 hash is stored in `trip_invites.token_hash`.
  - Raw token is returned only once from `create-trip-invite`.
  - Invite acceptance hashes the submitted token before lookup.
  - Expiration, max uses, revocation, invalid token, already-member, and successful-join states are handled.
- Activity log entries:
  - `trip_invite_created`
  - `trip_member_joined`

## Route Map

- `/trips/create`: create a trip.
- `/trips/[tripId]`: trip dashboard.
- `/trips/[tripId]/members`: member list.
- `/trips/[tripId]/invite`: create, copy, list, and revoke invite links.
- `/trips/[tripId]/settings`: edit trip basics and member permission toggles.
- `/invite/[token]`: public invitation join route.

## Edge Function Contracts

### `create-trip-invite`

Request body:

```json
{
  "tripId": "uuid",
  "expiresAt": "2026-08-10T10:00:00.000Z",
  "maxUses": 20
}
```

Response body:

```json
{
  "invite": {
    "id": "uuid",
    "trip_id": "uuid",
    "expires_at": "2026-08-10T10:00:00.000Z",
    "max_uses": 20,
    "use_count": 0,
    "revoked_at": null,
    "created_at": "timestamp"
  },
  "token": "raw-token-returned-once"
}
```

### `accept-trip-invite`

Request body:

```json
{
  "token": "raw-token-from-link"
}
```

Response body:

```json
{
  "status": "joined",
  "tripId": "uuid",
  "message": "You joined the trip."
}
```

Possible statuses:

- `joined`
- `already_member`
- `invalid`
- `expired`
- `revoked`
- `max_uses_reached`
- `pending_approval`

`pending_approval` is reserved for a later approval workflow and is not produced by the MVP accept function.

## RLS Verification Notes

Manual checks to run against a Supabase staging project:

1. External users cannot read trip data.
   - Sign in as user B with no membership.
   - Query `trips`, `trip_members`, `trip_invites`, `polls`, `expenses`, and `activity_log` for user A's trip.
   - Expected: no rows returned.

2. Non-admins cannot create invite links.
   - Sign in as a normal joined member.
   - Call `create-trip-invite`.
   - Expected: `403` with an admin/owner error.

3. Admins can create invite links.
   - Sign in as owner/admin.
   - Call `create-trip-invite` with a future `expiresAt` and positive `maxUses`.
   - Expected: invite row is created, token hash is stored, raw token is returned once, and activity log has `trip_invite_created`.

4. Users cannot read raw invite tokens.
   - Query `trip_invites` as owner/admin.
   - Expected: invite metadata is readable through normal client queries, but there is no raw token column to read.

5. Revoked invitations cannot be accepted.
   - Revoke an invite from the invite screen.
   - Open `/invite/[token]` as a logged-in user.
   - Expected: `revoked` status.

6. Expired invitations cannot be accepted.
   - Create an invite with a near-term expiration or update `expires_at` in staging.
   - Open `/invite/[token]`.
   - Expected: `expired` status.

7. Full invitations cannot be accepted.
   - Create an invite with `maxUses = 1`.
   - Accept once as user B.
   - Accept again as user C.
   - Expected: user B joins; user C receives `max_uses_reached`.

8. Existing members do not create duplicate memberships.
   - Accept the same invite twice as the same user.
   - Expected: second response is `already_member`, with one joined membership row.

9. Activity log remains append-only to clients.
   - Try inserting directly into `activity_log` from the mobile client.
   - Expected: RLS blocks the insert.
   - Accept an invite through the Edge Function.
   - Expected: service role writes `trip_member_joined`.

10. Service role stays server-only.
    - Confirm `SUPABASE_SERVICE_ROLE_KEY` exists only in Supabase Function secrets.
    - Confirm Expo client uses only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

## MVP Limitations

- The logged-out invitation screen shows a generic invitation prompt before authentication. It does not expose trip details publicly before login.
- Invite acceptance uses an Edge Function for controlled writes, but it is not yet backed by a database transaction RPC. The function uses optimistic `use_count` matching to avoid obvious overuse races.
- Member role management UI is not implemented yet.
- Regenerating invite links is implemented as creating a new invite and revoking the old one manually.
- Pending approval is reserved but not active in MVP.
