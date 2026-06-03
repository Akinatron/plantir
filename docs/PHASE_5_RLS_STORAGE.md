# Phase 5: RLS and Storage Policies

## Migration

Migration file:

- `supabase/migrations/20260603153000_rls_and_storage_policies.sql`

This migration enables RLS on all exposed app tables, adds helper functions, defines table policies, creates private Storage buckets, and adds Storage policies.

## Helper Functions

Required helpers:

- `is_trip_member(trip_id uuid, user_id uuid)`
- `is_trip_admin(trip_id uuid, user_id uuid)`
- `can_manage_trip(trip_id uuid, user_id uuid)`
- `can_vote_poll(poll_id uuid, user_id uuid)`
- `can_create_destination_proposal(poll_id uuid, user_id uuid)`
- `can_manage_expense(expense_id uuid, user_id uuid)`

Additional helpers:

- `is_trip_owner(trip_id uuid, user_id uuid)`
- `is_trip_read_only(trip_id uuid)`
- `can_create_expense(trip_id uuid, user_id uuid)`
- `shares_trip_with(target_user_id uuid, viewer_user_id uuid)`
- `can_manage_member_row(...)`
- `can_create_initial_owner_membership(...)`
- `can_access_expense(expense_id uuid, user_id uuid)`
- `can_manage_proposal_image(trip_id uuid, proposal_id uuid, user_id uuid)`
- Storage path helpers for UUID extraction.

Membership and permission helpers are `security definer` functions so policies do not recurse through `trip_members` RLS.

## Storage Buckets

All buckets are private.

- `avatars`
  - Path convention: `{user_id}/{file_name}`
  - Authenticated users can read avatars.
  - Users can manage files only under their own user-id folder.

- `trip-covers`
  - Path convention: `{trip_id}/{file_name}`
  - Trip members can read.
  - Owner/admin can manage.

- `proposal-images`
  - Path convention: `{trip_id}/{proposal_id}/{file_name}`
  - Trip members can read.
  - Proposal creator or owner/admin can manage while trip is writable.

- `receipts`
  - Path convention: `{trip_id}/{expense_id}/{file_name}`
  - Trip members can read.
  - Expense creator or owner/admin can manage while trip is writable.

- `trip-files`
  - Path convention: `{trip_id}/{file_name}`
  - Trip members can read and upload while trip is writable.
  - Owner/admin can update/delete.

## Security Notes

- External users cannot read trip-scoped data because table policies use `is_trip_member`.
- Users cannot vote for another user because date and destination vote policies require `user_id = auth.uid()`.
- Non-admins cannot close or reopen polls because poll updates require `can_manage_trip`.
- Non-admins cannot manage roles because trip member writes require owner/admin checks.
- Admins cannot modify owner membership through the member-row helper.
- Closed trips are read-only for member-generated writes through `is_trip_read_only`.
- Direct client writes to `activity_log` are blocked because only a SELECT policy exists.
- Settlement suggestions are read-only to clients; compute flows should use Edge Functions or service role.
- Invite acceptance should still be handled by an Edge Function so token validation and use-count increments are transactional.
- The Supabase service role key must never be exposed to the mobile client.
- The mobile app must use only `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

## Manual RLS Test Cases

Use at least three test users:

- User A: trip owner.
- User B: joined member.
- User C: external user.

### Profiles

- User A can read own profile.
- User A can read User B profile after sharing a trip.
- User C cannot read User A or User B profile unless they share a trip.
- User A cannot update User B profile.

### Trips

- User A can create a trip with `owner_id = auth.uid()`.
- User A can create the initial owner membership for that trip.
- User B can read the trip after joining.
- User C cannot read the trip.
- User B cannot update trip settings.
- User A/admin can update trip settings.
- Only owner can delete the trip.

### Members and Roles

- Trip members can read the member list.
- User C cannot read the member list.
- Member cannot promote themselves.
- Member cannot change another member role.
- Admin can manage member rows but cannot remove or alter owner membership.
- Owner can promote/demote admins.

### Invites

- Owner/admin can create invite rows.
- Member cannot create invite rows.
- External user cannot read invite rows.
- Invite acceptance should be verified through the Edge Function in a later phase.

### Polls

- Owner/admin can create date and destination polls.
- Member cannot create or close polls.
- Member can read polls for joined trips.
- External user cannot read polls.
- Owner/admin can close or reopen polls.

### Date Poll

- Member can insert availability only with `user_id = auth.uid()`.
- Member cannot insert availability for another user.
- Member can update/delete only their own availability.
- Member cannot vote after poll is closed.
- External user cannot read date availability or results.
- Clients cannot write `date_poll_results`; compute flow should use Edge Function/service role.

### Destination Proposals and Votes

- Member can create a proposal when `member_can_create_proposals = true`.
- Member cannot create a proposal when the setting is disabled unless admin.
- Proposal creator can edit their own proposal while trip is writable.
- Other member cannot edit someone else's proposal.
- Admin can moderate proposals.
- Member can vote only as themselves.
- Member cannot vote for a proposal from another trip.
- Unique index enforces one destination vote per member per poll.

### Tasks

- Members can read trip tasks.
- Members can create tasks while trip is writable.
- Creator, assignee, or admin can update a task.
- External user cannot read or write tasks.

### Expenses

- Member can create an expense when `member_can_create_expenses = true`.
- Member cannot create an expense when the setting is disabled unless admin.
- Creator/admin can update or delete an expense while trip is writable.
- Other members can read but not edit expenses.
- External user cannot read expenses.
- Expense payer/split rows can only be managed by the expense creator/admin.

### Settlements

- Trip members can read settlement suggestions and payments.
- External users cannot read settlements.
- Clients cannot insert settlement suggestions directly.
- Settlement payment updates are limited to payer, payee, or admin.

### Activity Log

- Trip members can read activity log rows.
- External users cannot read activity log rows.
- Authenticated clients cannot insert, update, or delete activity log rows.

### Notifications and Push Tokens

- Users can read/update only their own notifications.
- Users can create/update/delete only their own push tokens.
- Users cannot read another user's push tokens.

### Storage

- User can upload avatar only under `{own_user_id}/`.
- Trip member can read trip cover, proposal images, receipts, and trip files for their trip.
- External user cannot read any trip-scoped storage object.
- Proposal creator/admin can manage proposal images.
- Expense creator/admin can manage receipt files.
- Owner/admin can manage trip covers and trip files.

