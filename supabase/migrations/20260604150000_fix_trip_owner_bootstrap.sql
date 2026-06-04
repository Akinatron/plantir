-- Allow a trip owner to read the trip row immediately after creation.
-- The client creates the trip first, then creates the owner membership row.
-- Without this bootstrap read path, insert(...).select(...) is blocked by RLS
-- because trip_members does not exist yet for the new trip.

drop policy if exists "trips_select_members" on public.trips;

create policy "trips_select_members_or_owner"
on public.trips for select to authenticated
using (
  owner_id = (select auth.uid())
  or public.is_trip_member(id, (select auth.uid()))
);
