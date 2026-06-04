-- Plantir RLS and Storage policies.
-- This migration assumes the Phase 4 schema exists.
-- Service-role access bypasses RLS and must remain server-side only.

create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid()
$$;

create or replace function public.try_uuid(value text)
returns uuid
language plpgsql
immutable
as $$
begin
  return value::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

create or replace function public.storage_path_segment(object_name text, segment_index integer)
returns text
language sql
immutable
as $$
  select (string_to_array(object_name, '/'))[segment_index]
$$;

create or replace function public.storage_trip_id(object_name text)
returns uuid
language sql
immutable
as $$
  select public.try_uuid(public.storage_path_segment(object_name, 1))
$$;

create or replace function public.storage_second_uuid(object_name text)
returns uuid
language sql
immutable
as $$
  select public.try_uuid(public.storage_path_segment(object_name, 2))
$$;

create or replace function public.is_trip_member(target_trip_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trip_members tm
    join public.trips t on t.id = tm.trip_id
    where tm.trip_id = target_trip_id
      and tm.user_id = target_user_id
      and tm.status = 'joined'
      and t.deleted_at is null
  )
$$;

create or replace function public.is_trip_admin(target_trip_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trip_members tm
    join public.trips t on t.id = tm.trip_id
    where tm.trip_id = target_trip_id
      and tm.user_id = target_user_id
      and tm.status = 'joined'
      and tm.role in ('owner', 'admin')
      and t.deleted_at is null
  )
$$;

create or replace function public.is_trip_owner(target_trip_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trip_members tm
    join public.trips t on t.id = tm.trip_id
    where tm.trip_id = target_trip_id
      and tm.user_id = target_user_id
      and tm.status = 'joined'
      and tm.role = 'owner'
      and t.owner_id = target_user_id
      and t.deleted_at is null
  )
$$;

create or replace function public.can_manage_trip(target_trip_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_trip_admin(target_trip_id, target_user_id)
$$;

create or replace function public.is_trip_read_only(target_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trips t
    where t.id = target_trip_id
      and (t.status = 'closed' or t.closed_at is not null or t.deleted_at is not null)
  )
$$;

create or replace function public.can_vote_poll(target_poll_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.polls p
    where p.id = target_poll_id
      and p.status in ('active', 'reopened')
      and p.deleted_at is null
      and public.is_trip_member(p.trip_id, target_user_id)
      and not public.is_trip_read_only(p.trip_id)
  )
$$;

create or replace function public.can_create_destination_proposal(target_poll_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.polls p
    join public.trips t on t.id = p.trip_id
    where p.id = target_poll_id
      and p.type = 'destination'
      and p.status in ('active', 'reopened')
      and p.deleted_at is null
      and t.deleted_at is null
      and not public.is_trip_read_only(t.id)
      and public.is_trip_member(t.id, target_user_id)
      and (t.member_can_create_proposals or public.is_trip_admin(t.id, target_user_id))
  )
$$;

create or replace function public.can_create_expense(target_trip_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trips t
    where t.id = target_trip_id
      and t.deleted_at is null
      and not public.is_trip_read_only(t.id)
      and public.is_trip_member(t.id, target_user_id)
      and (t.member_can_create_expenses or public.is_trip_admin(t.id, target_user_id))
  )
$$;

create or replace function public.can_manage_expense(target_expense_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.expenses e
    where e.id = target_expense_id
      and e.deleted_at is null
      and not public.is_trip_read_only(e.trip_id)
      and public.is_trip_member(e.trip_id, target_user_id)
      and (e.created_by = target_user_id or public.is_trip_admin(e.trip_id, target_user_id))
  )
$$;

create or replace function public.shares_trip_with(target_user_id uuid, viewer_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trip_members viewer
    join public.trip_members target on target.trip_id = viewer.trip_id
    join public.trips t on t.id = viewer.trip_id
    where viewer.user_id = viewer_user_id
      and viewer.status = 'joined'
      and target.user_id = target_user_id
      and target.status = 'joined'
      and t.deleted_at is null
  )
$$;

create or replace function public.can_manage_member_row(
  target_trip_id uuid,
  target_member_user_id uuid,
  target_member_role public.trip_member_role,
  actor_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_trip_owner(target_trip_id, actor_user_id)
    or (
      public.is_trip_admin(target_trip_id, actor_user_id)
      and target_member_role = 'member'
      and not public.is_trip_owner(target_trip_id, target_member_user_id)
    )
$$;

create or replace function public.can_create_initial_owner_membership(
  target_trip_id uuid,
  target_user_id uuid,
  target_role public.trip_member_role,
  target_status public.trip_member_status
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trips t
    where t.id = target_trip_id
      and t.owner_id = target_user_id
      and t.deleted_at is null
      and target_role = 'owner'
      and target_status = 'joined'
  )
$$;

create or replace function public.can_access_expense(target_expense_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.expenses e
    where e.id = target_expense_id
      and e.deleted_at is null
      and public.is_trip_member(e.trip_id, target_user_id)
  )
$$;

create or replace function public.can_manage_proposal_image(
  target_trip_id uuid,
  target_proposal_id uuid,
  target_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.destination_proposals dp
    where dp.id = target_proposal_id
      and dp.trip_id = target_trip_id
      and dp.deleted_at is null
      and not public.is_trip_read_only(dp.trip_id)
      and (dp.created_by = target_user_id or public.is_trip_admin(dp.trip_id, target_user_id))
  )
$$;

grant execute on function public.is_trip_member(uuid, uuid) to authenticated;
grant execute on function public.is_trip_admin(uuid, uuid) to authenticated;
grant execute on function public.can_manage_trip(uuid, uuid) to authenticated;
grant execute on function public.can_vote_poll(uuid, uuid) to authenticated;
grant execute on function public.can_create_destination_proposal(uuid, uuid) to authenticated;
grant execute on function public.can_manage_expense(uuid, uuid) to authenticated;
grant execute on function public.current_user_id() to authenticated;
grant execute on function public.try_uuid(text) to authenticated;
grant execute on function public.storage_path_segment(text, integer) to authenticated;
grant execute on function public.storage_trip_id(text) to authenticated;
grant execute on function public.storage_second_uuid(text) to authenticated;
grant execute on function public.is_trip_owner(uuid, uuid) to authenticated;
grant execute on function public.is_trip_read_only(uuid) to authenticated;
grant execute on function public.can_create_expense(uuid, uuid) to authenticated;
grant execute on function public.shares_trip_with(uuid, uuid) to authenticated;
grant execute on function public.can_manage_member_row(uuid, uuid, public.trip_member_role, uuid) to authenticated;
grant execute on function public.can_create_initial_owner_membership(uuid, uuid, public.trip_member_role, public.trip_member_status) to authenticated;
grant execute on function public.can_access_expense(uuid, uuid) to authenticated;
grant execute on function public.can_manage_proposal_image(uuid, uuid, uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_invites enable row level security;
alter table public.polls enable row level security;
alter table public.date_poll_allowed_ranges enable row level security;
alter table public.date_availability_votes enable row level security;
alter table public.date_poll_results enable row level security;
alter table public.destination_proposals enable row level security;
alter table public.destination_proposal_images enable row level security;
alter table public.destination_votes enable row level security;
alter table public.tasks enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_payers enable row level security;
alter table public.expense_splits enable row level security;
alter table public.settlement_suggestions enable row level security;
alter table public.settlement_payments enable row level security;
alter table public.activity_log enable row level security;
alter table public.push_tokens enable row level security;
alter table public.notifications enable row level security;

create policy "profiles_select_self_or_shared_trip"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or public.shares_trip_with(id, (select auth.uid()))
);

create policy "profiles_insert_self"
on public.profiles for insert to authenticated
with check (id = (select auth.uid()));

create policy "profiles_update_self"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "trips_select_members"
on public.trips for select to authenticated
using (public.is_trip_member(id, (select auth.uid())));

create policy "trips_insert_owner"
on public.trips for insert to authenticated
with check (owner_id = (select auth.uid()));

create policy "trips_update_admins"
on public.trips for update to authenticated
using (public.can_manage_trip(id, (select auth.uid())))
with check (public.can_manage_trip(id, (select auth.uid())));

create policy "trips_delete_owner"
on public.trips for delete to authenticated
using (public.is_trip_owner(id, (select auth.uid())));

create policy "trip_members_select_trip_members"
on public.trip_members for select to authenticated
using (public.is_trip_member(trip_id, (select auth.uid())));

create policy "trip_members_insert_by_admin_or_initial_owner"
on public.trip_members for insert to authenticated
with check (
  public.can_manage_member_row(trip_id, user_id, role, (select auth.uid()))
  or public.can_create_initial_owner_membership(trip_id, user_id, role, status)
);

create policy "trip_members_update_by_admins"
on public.trip_members for update to authenticated
using (public.can_manage_member_row(trip_id, user_id, role, (select auth.uid())))
with check (public.can_manage_member_row(trip_id, user_id, role, (select auth.uid())));

create policy "trip_members_delete_by_owner"
on public.trip_members for delete to authenticated
using (public.is_trip_owner(trip_id, (select auth.uid())) and role <> 'owner');

create policy "trip_invites_select_admins"
on public.trip_invites for select to authenticated
using (public.can_manage_trip(trip_id, (select auth.uid())));

create policy "trip_invites_insert_admins"
on public.trip_invites for insert to authenticated
with check (
  created_by = (select auth.uid())
  and public.can_manage_trip(trip_id, (select auth.uid()))
);

create policy "trip_invites_update_admins"
on public.trip_invites for update to authenticated
using (public.can_manage_trip(trip_id, (select auth.uid())))
with check (public.can_manage_trip(trip_id, (select auth.uid())));

create policy "trip_invites_delete_admins"
on public.trip_invites for delete to authenticated
using (public.can_manage_trip(trip_id, (select auth.uid())));

create policy "polls_select_members"
on public.polls for select to authenticated
using (public.is_trip_member(trip_id, (select auth.uid())));

create policy "polls_insert_admins"
on public.polls for insert to authenticated
with check (
  created_by = (select auth.uid())
  and public.can_manage_trip(trip_id, (select auth.uid()))
  and not public.is_trip_read_only(trip_id)
);

create policy "polls_update_admins"
on public.polls for update to authenticated
using (public.can_manage_trip(trip_id, (select auth.uid())))
with check (public.can_manage_trip(trip_id, (select auth.uid())));

create policy "polls_delete_admins"
on public.polls for delete to authenticated
using (public.can_manage_trip(trip_id, (select auth.uid())));

create policy "date_poll_allowed_ranges_select_members"
on public.date_poll_allowed_ranges for select to authenticated
using (
  exists (
    select 1 from public.polls p
    where p.id = date_poll_allowed_ranges.poll_id
      and public.is_trip_member(p.trip_id, (select auth.uid()))
  )
);

create policy "date_poll_allowed_ranges_manage_admins"
on public.date_poll_allowed_ranges for all to authenticated
using (
  exists (
    select 1 from public.polls p
    where p.id = date_poll_allowed_ranges.poll_id
      and public.can_manage_trip(p.trip_id, (select auth.uid()))
      and not public.is_trip_read_only(p.trip_id)
  )
)
with check (
  exists (
    select 1 from public.polls p
    where p.id = date_poll_allowed_ranges.poll_id
      and p.type = 'date'
      and public.can_manage_trip(p.trip_id, (select auth.uid()))
      and not public.is_trip_read_only(p.trip_id)
  )
);

create policy "date_availability_votes_select_members"
on public.date_availability_votes for select to authenticated
using (
  exists (
    select 1 from public.polls p
    where p.id = date_availability_votes.poll_id
      and public.is_trip_member(p.trip_id, (select auth.uid()))
  )
);

create policy "date_availability_votes_insert_own"
on public.date_availability_votes for insert to authenticated
with check (
  date_availability_votes.user_id = (select auth.uid())
  and public.can_vote_poll(date_availability_votes.poll_id, (select auth.uid()))
  and exists (select 1 from public.polls p where p.id = date_availability_votes.poll_id and p.type = 'date')
);

create policy "date_availability_votes_update_own"
on public.date_availability_votes for update to authenticated
using (
  date_availability_votes.user_id = (select auth.uid())
  and public.can_vote_poll(date_availability_votes.poll_id, (select auth.uid()))
)
with check (
  date_availability_votes.user_id = (select auth.uid())
  and public.can_vote_poll(date_availability_votes.poll_id, (select auth.uid()))
);

create policy "date_availability_votes_delete_own"
on public.date_availability_votes for delete to authenticated
using (
  date_availability_votes.user_id = (select auth.uid())
  and public.can_vote_poll(date_availability_votes.poll_id, (select auth.uid()))
);

create policy "date_poll_results_select_members"
on public.date_poll_results for select to authenticated
using (
  exists (
    select 1 from public.polls p
    where p.id = date_poll_results.poll_id
      and public.is_trip_member(p.trip_id, (select auth.uid()))
  )
);

create policy "destination_proposals_select_members"
on public.destination_proposals for select to authenticated
using (public.is_trip_member(trip_id, (select auth.uid())));

create policy "destination_proposals_insert_allowed_members"
on public.destination_proposals for insert to authenticated
with check (
  destination_proposals.created_by = (select auth.uid())
  and destination_proposals.poll_id is not null
  and public.can_create_destination_proposal(destination_proposals.poll_id, (select auth.uid()))
  and exists (
    select 1 from public.polls p
    where p.id = destination_proposals.poll_id
      and p.trip_id = destination_proposals.trip_id
      and p.type = 'destination'
  )
);

create policy "destination_proposals_update_creator_or_admin"
on public.destination_proposals for update to authenticated
using (
  public.is_trip_member(trip_id, (select auth.uid()))
  and not public.is_trip_read_only(trip_id)
  and (created_by = (select auth.uid()) or public.is_trip_admin(trip_id, (select auth.uid())))
)
with check (
  public.is_trip_member(trip_id, (select auth.uid()))
  and (created_by = (select auth.uid()) or public.is_trip_admin(trip_id, (select auth.uid())))
);

create policy "destination_proposals_delete_creator_or_admin"
on public.destination_proposals for delete to authenticated
using (
  public.is_trip_member(trip_id, (select auth.uid()))
  and not public.is_trip_read_only(trip_id)
  and (created_by = (select auth.uid()) or public.is_trip_admin(trip_id, (select auth.uid())))
);

create policy "destination_proposal_images_select_members"
on public.destination_proposal_images for select to authenticated
using (
  exists (
    select 1 from public.destination_proposals dp
    where dp.id = destination_proposal_images.proposal_id
      and public.is_trip_member(dp.trip_id, (select auth.uid()))
  )
);

create policy "destination_proposal_images_insert_creator_or_admin"
on public.destination_proposal_images for insert to authenticated
with check (
  destination_proposal_images.created_by = (select auth.uid())
  and exists (
    select 1 from public.destination_proposals dp
    where dp.id = destination_proposal_images.proposal_id
      and dp.deleted_at is null
      and not public.is_trip_read_only(dp.trip_id)
      and (dp.created_by = (select auth.uid()) or public.is_trip_admin(dp.trip_id, (select auth.uid())))
  )
);

create policy "destination_proposal_images_update_creator_or_admin"
on public.destination_proposal_images for update to authenticated
using (
  exists (
    select 1 from public.destination_proposals dp
    where dp.id = destination_proposal_images.proposal_id
      and not public.is_trip_read_only(dp.trip_id)
      and (dp.created_by = (select auth.uid()) or public.is_trip_admin(dp.trip_id, (select auth.uid())))
  )
)
with check (
  exists (
    select 1 from public.destination_proposals dp
    where dp.id = destination_proposal_images.proposal_id
      and (dp.created_by = (select auth.uid()) or public.is_trip_admin(dp.trip_id, (select auth.uid())))
  )
);

create policy "destination_proposal_images_delete_creator_or_admin"
on public.destination_proposal_images for delete to authenticated
using (
  exists (
    select 1 from public.destination_proposals dp
    where dp.id = destination_proposal_images.proposal_id
      and not public.is_trip_read_only(dp.trip_id)
      and (dp.created_by = (select auth.uid()) or public.is_trip_admin(dp.trip_id, (select auth.uid())))
  )
);

create policy "destination_votes_select_members"
on public.destination_votes for select to authenticated
using (public.is_trip_member(trip_id, (select auth.uid())));

create policy "destination_votes_insert_own_single_choice"
on public.destination_votes for insert to authenticated
with check (
  destination_votes.user_id = (select auth.uid())
  and public.can_vote_poll(destination_votes.poll_id, (select auth.uid()))
  and exists (
    select 1
    from public.polls p
    join public.destination_proposals dp on dp.id = destination_votes.proposal_id
    where p.id = destination_votes.poll_id
      and p.type = 'destination'
      and p.trip_id = destination_votes.trip_id
      and dp.trip_id = destination_votes.trip_id
      and dp.poll_id = destination_votes.poll_id
      and dp.deleted_at is null
  )
);

create policy "destination_votes_update_own"
on public.destination_votes for update to authenticated
using (
  destination_votes.user_id = (select auth.uid())
  and public.can_vote_poll(destination_votes.poll_id, (select auth.uid()))
)
with check (
  destination_votes.user_id = (select auth.uid())
  and public.can_vote_poll(destination_votes.poll_id, (select auth.uid()))
);

create policy "destination_votes_delete_own"
on public.destination_votes for delete to authenticated
using (
  destination_votes.user_id = (select auth.uid())
  and public.can_vote_poll(destination_votes.poll_id, (select auth.uid()))
);

create policy "tasks_select_members"
on public.tasks for select to authenticated
using (public.is_trip_member(trip_id, (select auth.uid())));

create policy "tasks_insert_members"
on public.tasks for insert to authenticated
with check (
  created_by = (select auth.uid())
  and public.is_trip_member(trip_id, (select auth.uid()))
  and not public.is_trip_read_only(trip_id)
);

create policy "tasks_update_creator_assignee_or_admin"
on public.tasks for update to authenticated
using (
  public.is_trip_member(trip_id, (select auth.uid()))
  and not public.is_trip_read_only(trip_id)
  and (
    created_by = (select auth.uid())
    or assigned_to = (select auth.uid())
    or public.is_trip_admin(trip_id, (select auth.uid()))
  )
)
with check (
  public.is_trip_member(trip_id, (select auth.uid()))
  and (
    created_by = (select auth.uid())
    or assigned_to = (select auth.uid())
    or public.is_trip_admin(trip_id, (select auth.uid()))
  )
);

create policy "tasks_delete_creator_or_admin"
on public.tasks for delete to authenticated
using (
  not public.is_trip_read_only(trip_id)
  and (created_by = (select auth.uid()) or public.is_trip_admin(trip_id, (select auth.uid())))
);

create policy "expenses_select_members"
on public.expenses for select to authenticated
using (public.is_trip_member(trip_id, (select auth.uid())));

create policy "expenses_insert_allowed_members"
on public.expenses for insert to authenticated
with check (
  created_by = (select auth.uid())
  and public.can_create_expense(trip_id, (select auth.uid()))
);

create policy "expenses_update_creator_or_admin"
on public.expenses for update to authenticated
using (public.can_manage_expense(id, (select auth.uid())))
with check (public.can_manage_expense(id, (select auth.uid())));

create policy "expenses_delete_creator_or_admin"
on public.expenses for delete to authenticated
using (public.can_manage_expense(id, (select auth.uid())));

create policy "expense_payers_select_members"
on public.expense_payers for select to authenticated
using (public.can_access_expense(expense_id, (select auth.uid())));

create policy "expense_payers_manage_expense_managers"
on public.expense_payers for all to authenticated
using (public.can_manage_expense(expense_id, (select auth.uid())))
with check (public.can_manage_expense(expense_id, (select auth.uid())));

create policy "expense_splits_select_members"
on public.expense_splits for select to authenticated
using (public.can_access_expense(expense_id, (select auth.uid())));

create policy "expense_splits_manage_expense_managers"
on public.expense_splits for all to authenticated
using (public.can_manage_expense(expense_id, (select auth.uid())))
with check (public.can_manage_expense(expense_id, (select auth.uid())));

create policy "settlement_suggestions_select_members"
on public.settlement_suggestions for select to authenticated
using (public.is_trip_member(trip_id, (select auth.uid())));

create policy "settlement_payments_select_members"
on public.settlement_payments for select to authenticated
using (public.is_trip_member(trip_id, (select auth.uid())));

create policy "settlement_payments_update_participant_or_admin"
on public.settlement_payments for update to authenticated
using (
  public.is_trip_member(trip_id, (select auth.uid()))
  and (
    from_user_id = (select auth.uid())
    or to_user_id = (select auth.uid())
    or public.is_trip_admin(trip_id, (select auth.uid()))
  )
)
with check (
  public.is_trip_member(trip_id, (select auth.uid()))
  and (
    from_user_id = (select auth.uid())
    or to_user_id = (select auth.uid())
    or public.is_trip_admin(trip_id, (select auth.uid()))
  )
);

create policy "activity_log_select_members"
on public.activity_log for select to authenticated
using (public.is_trip_member(trip_id, (select auth.uid())));

-- No INSERT/UPDATE/DELETE policies are created for activity_log.
-- Direct client writes are blocked by RLS. Edge Functions using the service role may write audit events.

create policy "push_tokens_select_own"
on public.push_tokens for select to authenticated
using (user_id = (select auth.uid()));

create policy "push_tokens_insert_own"
on public.push_tokens for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "push_tokens_update_own"
on public.push_tokens for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "push_tokens_delete_own"
on public.push_tokens for delete to authenticated
using (user_id = (select auth.uid()));

create policy "notifications_select_own"
on public.notifications for select to authenticated
using (user_id = (select auth.uid()));

create policy "notifications_update_own_status"
on public.notifications for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('trip-covers', 'trip-covers', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('proposal-images', 'proposal-images', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('receipts', 'receipts', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('trip-files', 'trip-files', false, 26214400, null)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "storage_avatars_select_authenticated"
on storage.objects for select to authenticated
using (bucket_id = 'avatars');

create policy "storage_avatars_insert_own_folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and public.storage_trip_id(name) = (select auth.uid())
);

create policy "storage_avatars_update_own_folder"
on storage.objects for update to authenticated
using (
  bucket_id = 'avatars'
  and public.storage_trip_id(name) = (select auth.uid())
)
with check (
  bucket_id = 'avatars'
  and public.storage_trip_id(name) = (select auth.uid())
);

create policy "storage_avatars_delete_own_folder"
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and public.storage_trip_id(name) = (select auth.uid())
);

create policy "storage_trip_covers_select_members"
on storage.objects for select to authenticated
using (
  bucket_id = 'trip-covers'
  and public.is_trip_member(public.storage_trip_id(name), (select auth.uid()))
);

create policy "storage_trip_covers_manage_admins"
on storage.objects for all to authenticated
using (
  bucket_id = 'trip-covers'
  and public.can_manage_trip(public.storage_trip_id(name), (select auth.uid()))
)
with check (
  bucket_id = 'trip-covers'
  and public.can_manage_trip(public.storage_trip_id(name), (select auth.uid()))
);

create policy "storage_proposal_images_select_members"
on storage.objects for select to authenticated
using (
  bucket_id = 'proposal-images'
  and public.is_trip_member(public.storage_trip_id(name), (select auth.uid()))
);

create policy "storage_proposal_images_manage_creator_or_admin"
on storage.objects for all to authenticated
using (
  bucket_id = 'proposal-images'
  and public.can_manage_proposal_image(
    public.storage_trip_id(name),
    public.storage_second_uuid(name),
    (select auth.uid())
  )
)
with check (
  bucket_id = 'proposal-images'
  and public.can_manage_proposal_image(
    public.storage_trip_id(name),
    public.storage_second_uuid(name),
    (select auth.uid())
  )
);

create policy "storage_receipts_select_members"
on storage.objects for select to authenticated
using (
  bucket_id = 'receipts'
  and public.is_trip_member(public.storage_trip_id(name), (select auth.uid()))
);

create policy "storage_receipts_manage_expense_managers"
on storage.objects for all to authenticated
using (
  bucket_id = 'receipts'
  and public.can_manage_expense(public.storage_second_uuid(name), (select auth.uid()))
)
with check (
  bucket_id = 'receipts'
  and public.can_manage_expense(public.storage_second_uuid(name), (select auth.uid()))
);

create policy "storage_trip_files_select_members"
on storage.objects for select to authenticated
using (
  bucket_id = 'trip-files'
  and public.is_trip_member(public.storage_trip_id(name), (select auth.uid()))
);

create policy "storage_trip_files_insert_members"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'trip-files'
  and public.is_trip_member(public.storage_trip_id(name), (select auth.uid()))
  and not public.is_trip_read_only(public.storage_trip_id(name))
);

create policy "storage_trip_files_update_admins"
on storage.objects for update to authenticated
using (
  bucket_id = 'trip-files'
  and public.can_manage_trip(public.storage_trip_id(name), (select auth.uid()))
)
with check (
  bucket_id = 'trip-files'
  and public.can_manage_trip(public.storage_trip_id(name), (select auth.uid()))
);

create policy "storage_trip_files_delete_admins"
on storage.objects for delete to authenticated
using (
  bucket_id = 'trip-files'
  and public.can_manage_trip(public.storage_trip_id(name), (select auth.uid()))
);

comment on function public.is_trip_member(uuid, uuid) is 'RLS helper: true when user is a joined member of a non-deleted trip.';
comment on function public.is_trip_admin(uuid, uuid) is 'RLS helper: true when user is joined as owner/admin.';
comment on function public.can_manage_trip(uuid, uuid) is 'RLS helper for owner/admin trip management.';
comment on function public.can_vote_poll(uuid, uuid) is 'RLS helper: members can vote only on active/reopened polls for non-read-only trips.';
comment on function public.can_create_destination_proposal(uuid, uuid) is 'RLS helper: enforces destination poll state, membership, trip setting, and read-only state.';
comment on function public.can_manage_expense(uuid, uuid) is 'RLS helper: expense creator or trip admin can manage active expenses while trip is writable.';
comment on function public.can_create_initial_owner_membership(uuid, uuid, public.trip_member_role, public.trip_member_status) is 'RLS bootstrap helper for creating the owner membership immediately after trip insertion.';
