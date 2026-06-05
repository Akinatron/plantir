-- Frontend redesign backend support.
-- Adds only the durable backend primitives required by the new real UI:
-- manual trip confirmation, result visibility settings, settlement mark-paid policy,
-- and persistent comparable custom fields for destination/place proposals.

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'settlement_mark_paid_policy'
      and n.nspname = 'public'
  ) then
    create type public.settlement_mark_paid_policy as enum ('owner_admin_only', 'participants');
  end if;

  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'destination_custom_field_type'
      and n.nspname = 'public'
  ) then
    create type public.destination_custom_field_type as enum ('text', 'number', 'money', 'boolean', 'url');
  end if;
end
$$;

alter table public.trips
  add column if not exists confirmed_at timestamptz,
  add column if not exists confirmed_by uuid references public.profiles(id) on delete set null,
  add column if not exists confirmed_note text,
  add column if not exists member_can_see_date_results boolean not null default true,
  add column if not exists member_can_see_place_results boolean not null default true,
  add column if not exists member_can_modify_place_fields boolean not null default false,
  add column if not exists settlement_mark_paid_policy public.settlement_mark_paid_policy not null default 'participants',
  add constraint trips_confirmation_consistent check (
    (confirmed_at is null and confirmed_by is null)
    or (confirmed_at is not null and confirmed_by is not null)
  );

comment on column public.trips.confirmed_at is 'Manual owner/admin confirmation instant for the user-facing Trip confirmed state.';
comment on column public.trips.confirmed_by is 'Profile that manually confirmed the trip.';
comment on column public.trips.confirmed_note is 'Optional owner/admin confirmation note.';
comment on column public.trips.member_can_see_date_results is 'Controls whether members can see date poll rankings/results. Admins can always see them.';
comment on column public.trips.member_can_see_place_results is 'Controls whether members can see destination/place rankings/results. Admins can always see them.';
comment on column public.trips.member_can_modify_place_fields is 'Controls whether members can create or edit comparable custom fields for place proposals.';
comment on column public.trips.settlement_mark_paid_policy is 'Controls who can mark optimized settlement suggestions as paid.';

create table if not exists public.destination_custom_fields (
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
  constraint destination_custom_fields_emoji_not_blank check (emoji is null or length(btrim(emoji)) > 0),
  constraint destination_custom_fields_sort_non_negative check (sort_order >= 0)
);

comment on table public.destination_custom_fields is 'Comparable owner/admin or allowed-member configured fields for place proposals.';
comment on column public.destination_custom_fields.show_on_card is 'When true, the field is eligible for compact place-card previews.';
comment on column public.destination_custom_fields.required is 'When true, the create/edit place flow should require a value.';

create table if not exists public.destination_custom_field_values (
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
  constraint destination_custom_field_values_unique unique (proposal_id, field_id),
  constraint destination_custom_field_values_money_non_negative check (
    value_money_cents is null or value_money_cents >= 0
  ),
  constraint destination_custom_field_values_url_not_blank check (
    value_url is null or length(btrim(value_url)) > 0
  ),
  constraint destination_custom_field_values_at_most_one_value check (
    num_nonnulls(value_text, value_number, value_money_cents, value_boolean, value_url) <= 1
  )
);

comment on table public.destination_custom_field_values is 'Proposal-specific values for configured comparable destination custom fields.';

create trigger destination_custom_fields_set_updated_at
before update on public.destination_custom_fields
for each row execute function public.set_updated_at();

create trigger destination_custom_field_values_set_updated_at
before update on public.destination_custom_field_values
for each row execute function public.set_updated_at();

create index if not exists trips_confirmed_by_idx on public.trips(confirmed_by) where confirmed_by is not null;
create index if not exists destination_custom_fields_trip_poll_idx
  on public.destination_custom_fields(trip_id, poll_id, sort_order)
  where deleted_at is null;
create index if not exists destination_custom_fields_created_by_idx on public.destination_custom_fields(created_by);
create index if not exists destination_custom_field_values_proposal_id_idx on public.destination_custom_field_values(proposal_id);
create index if not exists destination_custom_field_values_field_id_idx on public.destination_custom_field_values(field_id);

create or replace function public.can_manage_destination_custom_fields(target_trip_id uuid, target_user_id uuid)
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
      and (
        public.is_trip_admin(t.id, target_user_id)
        or t.member_can_modify_place_fields
      )
  )
$$;

grant execute on function public.can_manage_destination_custom_fields(uuid, uuid) to authenticated;

drop policy if exists "date_availability_votes_select_members" on public.date_availability_votes;
drop policy if exists "date_poll_results_select_members" on public.date_poll_results;
drop policy if exists "destination_votes_select_members" on public.destination_votes;
drop policy if exists "destination_poll_results_select_members" on public.destination_poll_results;
drop policy if exists "settlement_payments_update_participant_or_admin" on public.settlement_payments;

create policy "date_availability_votes_select_visible"
on public.date_availability_votes for select to authenticated
using (
  date_availability_votes.user_id = (select auth.uid())
  or exists (
    select 1
    from public.polls p
    join public.trips t on t.id = p.trip_id
    where p.id = date_availability_votes.poll_id
      and public.is_trip_member(p.trip_id, (select auth.uid()))
      and (
        public.is_trip_admin(p.trip_id, (select auth.uid()))
        or t.member_can_see_date_results
      )
  )
);

create policy "date_poll_results_select_visible"
on public.date_poll_results for select to authenticated
using (
  exists (
    select 1
    from public.polls p
    join public.trips t on t.id = p.trip_id
    where p.id = date_poll_results.poll_id
      and public.is_trip_member(p.trip_id, (select auth.uid()))
      and (
        public.is_trip_admin(p.trip_id, (select auth.uid()))
        or t.member_can_see_date_results
      )
  )
);

create policy "destination_votes_select_visible"
on public.destination_votes for select to authenticated
using (
  destination_votes.user_id = (select auth.uid())
  or exists (
    select 1
    from public.trips t
    where t.id = destination_votes.trip_id
      and public.is_trip_member(t.id, (select auth.uid()))
      and (
        public.is_trip_admin(t.id, (select auth.uid()))
        or t.member_can_see_place_results
      )
  )
);

create policy "destination_poll_results_select_visible"
on public.destination_poll_results for select to authenticated
using (
  exists (
    select 1
    from public.polls p
    join public.trips t on t.id = p.trip_id
    where p.id = destination_poll_results.poll_id
      and public.is_trip_member(p.trip_id, (select auth.uid()))
      and (
        public.is_trip_admin(p.trip_id, (select auth.uid()))
        or t.member_can_see_place_results
      )
  )
);

create policy "settlement_payments_update_by_policy"
on public.settlement_payments for update to authenticated
using (
  exists (
    select 1
    from public.trips t
    where t.id = settlement_payments.trip_id
      and public.is_trip_member(t.id, (select auth.uid()))
      and not public.is_trip_read_only(t.id)
      and (
        public.is_trip_admin(t.id, (select auth.uid()))
        or (
          t.settlement_mark_paid_policy = 'participants'
          and (
            settlement_payments.from_user_id = (select auth.uid())
            or settlement_payments.to_user_id = (select auth.uid())
          )
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.trips t
    where t.id = settlement_payments.trip_id
      and public.is_trip_member(t.id, (select auth.uid()))
      and not public.is_trip_read_only(t.id)
      and (
        public.is_trip_admin(t.id, (select auth.uid()))
        or (
          t.settlement_mark_paid_policy = 'participants'
          and (
            settlement_payments.from_user_id = (select auth.uid())
            or settlement_payments.to_user_id = (select auth.uid())
          )
        )
      )
  )
);

alter table public.destination_custom_fields enable row level security;
alter table public.destination_custom_field_values enable row level security;

create policy "destination_custom_fields_select_members"
on public.destination_custom_fields for select to authenticated
using (
  deleted_at is null
  and public.is_trip_member(trip_id, (select auth.uid()))
);

create policy "destination_custom_fields_insert_allowed"
on public.destination_custom_fields for insert to authenticated
with check (
  created_by = (select auth.uid())
  and public.can_manage_destination_custom_fields(trip_id, (select auth.uid()))
  and (
    poll_id is null
    or exists (
      select 1
      from public.polls p
      where p.id = destination_custom_fields.poll_id
        and p.trip_id = destination_custom_fields.trip_id
        and p.type = 'destination'
        and p.deleted_at is null
    )
  )
);

create policy "destination_custom_fields_update_allowed"
on public.destination_custom_fields for update to authenticated
using (
  public.can_manage_destination_custom_fields(trip_id, (select auth.uid()))
)
with check (
  public.can_manage_destination_custom_fields(trip_id, (select auth.uid()))
  and (
    poll_id is null
    or exists (
      select 1
      from public.polls p
      where p.id = destination_custom_fields.poll_id
        and p.trip_id = destination_custom_fields.trip_id
        and p.type = 'destination'
        and p.deleted_at is null
    )
  )
);

create policy "destination_custom_fields_delete_allowed"
on public.destination_custom_fields for delete to authenticated
using (
  public.can_manage_destination_custom_fields(trip_id, (select auth.uid()))
);

create policy "destination_custom_field_values_select_members"
on public.destination_custom_field_values for select to authenticated
using (
  exists (
    select 1
    from public.destination_proposals dp
    join public.destination_custom_fields dcf on dcf.id = destination_custom_field_values.field_id
    where dp.id = destination_custom_field_values.proposal_id
      and dp.deleted_at is null
      and dcf.deleted_at is null
      and dcf.trip_id = dp.trip_id
      and (dcf.poll_id is null or dcf.poll_id = dp.poll_id)
      and public.is_trip_member(dp.trip_id, (select auth.uid()))
  )
);

create policy "destination_custom_field_values_insert_proposal_creator_or_admin"
on public.destination_custom_field_values for insert to authenticated
with check (
  exists (
    select 1
    from public.destination_proposals dp
    join public.destination_custom_fields dcf on dcf.id = destination_custom_field_values.field_id
    where dp.id = destination_custom_field_values.proposal_id
      and dp.deleted_at is null
      and dcf.deleted_at is null
      and dcf.trip_id = dp.trip_id
      and (dcf.poll_id is null or dcf.poll_id = dp.poll_id)
      and not public.is_trip_read_only(dp.trip_id)
      and (
        dp.created_by = (select auth.uid())
        or public.is_trip_admin(dp.trip_id, (select auth.uid()))
      )
  )
);

create policy "destination_custom_field_values_update_proposal_creator_or_admin"
on public.destination_custom_field_values for update to authenticated
using (
  exists (
    select 1
    from public.destination_proposals dp
    where dp.id = destination_custom_field_values.proposal_id
      and not public.is_trip_read_only(dp.trip_id)
      and (
        dp.created_by = (select auth.uid())
        or public.is_trip_admin(dp.trip_id, (select auth.uid()))
      )
  )
)
with check (
  exists (
    select 1
    from public.destination_proposals dp
    join public.destination_custom_fields dcf on dcf.id = destination_custom_field_values.field_id
    where dp.id = destination_custom_field_values.proposal_id
      and dp.deleted_at is null
      and dcf.deleted_at is null
      and dcf.trip_id = dp.trip_id
      and (dcf.poll_id is null or dcf.poll_id = dp.poll_id)
      and not public.is_trip_read_only(dp.trip_id)
      and (
        dp.created_by = (select auth.uid())
        or public.is_trip_admin(dp.trip_id, (select auth.uid()))
      )
  )
);

create policy "destination_custom_field_values_delete_proposal_creator_or_admin"
on public.destination_custom_field_values for delete to authenticated
using (
  exists (
    select 1
    from public.destination_proposals dp
    where dp.id = destination_custom_field_values.proposal_id
      and not public.is_trip_read_only(dp.trip_id)
      and (
        dp.created_by = (select auth.uid())
        or public.is_trip_admin(dp.trip_id, (select auth.uid()))
      )
  )
);

comment on function public.can_manage_destination_custom_fields(uuid, uuid) is 'RLS helper: trip admins or members allowed by trip setting can manage destination custom fields while the trip is writable.';
