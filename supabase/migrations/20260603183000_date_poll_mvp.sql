-- Phase 9: MVP date poll configuration, explicit vote status, and richer result persistence.

create type public.date_availability_status as enum ('preferred', 'available', 'maybe', 'unavailable');

alter table public.polls
  add column min_trip_days integer,
  add column max_trip_days integer,
  add column voting_deadline_at timestamptz,
  add constraint polls_trip_days_positive check (
    min_trip_days is null
    or (
      min_trip_days > 0
      and max_trip_days is not null
      and max_trip_days >= min_trip_days
    )
  );

comment on column public.polls.min_trip_days is 'MVP date poll minimum candidate duration in travel days.';
comment on column public.polls.max_trip_days is 'MVP date poll maximum candidate duration in travel days.';
comment on column public.polls.voting_deadline_at is 'Optional instant after which date voting should be closed by admins.';

alter table public.date_availability_votes
  add column status public.date_availability_status not null default 'available';

comment on table public.date_availability_votes is 'MVP date poll votes store one explicit status per member per travel day: preferred, available, maybe, or unavailable.';
comment on column public.date_availability_votes.status is 'Explicit day-level vote status. Missing rows are treated as pending by the algorithm.';

create table public.date_poll_required_members (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint date_poll_required_members_unique unique (poll_id, user_id)
);

comment on table public.date_poll_required_members is 'Optional MVP date poll list of members whose availability is highlighted as required by the algorithm.';

alter table public.date_poll_required_members enable row level security;

create index date_availability_votes_status_idx on public.date_availability_votes(poll_id, status);
create index date_poll_required_members_poll_id_idx on public.date_poll_required_members(poll_id);
create index date_poll_required_members_user_id_idx on public.date_poll_required_members(user_id);

create policy "date_poll_required_members_select_members"
on public.date_poll_required_members for select to authenticated
using (
  exists (
    select 1 from public.polls p
    where p.id = date_poll_required_members.poll_id
      and public.is_trip_member(p.trip_id, (select auth.uid()))
  )
);

create policy "date_poll_required_members_manage_admins"
on public.date_poll_required_members for all to authenticated
using (
  exists (
    select 1 from public.polls p
    where p.id = date_poll_required_members.poll_id
      and p.type = 'date'
      and public.can_manage_trip(p.trip_id, (select auth.uid()))
      and not public.is_trip_read_only(p.trip_id)
  )
)
with check (
  exists (
    select 1 from public.polls p
    where p.id = date_poll_required_members.poll_id
      and p.type = 'date'
      and public.can_manage_trip(p.trip_id, (select auth.uid()))
      and not public.is_trip_read_only(p.trip_id)
  )
);

alter table public.date_poll_results
  add column preferred_member_count integer not null default 0,
  add column maybe_member_count integer not null default 0,
  add column unavailable_member_count integer not null default 0,
  add column pending_member_count integer not null default 0,
  add column required_members_missing_count integer not null default 0,
  add column rank_reason text not null default '',
  add constraint date_poll_results_extended_counts_valid check (
    preferred_member_count >= 0
    and maybe_member_count >= 0
    and unavailable_member_count >= 0
    and pending_member_count >= 0
    and required_members_missing_count >= 0
  );

comment on column public.date_poll_results.available_member_count is 'Available plus preferred members for the winning candidate. This matches the approved deterministic tie-breaker.';
comment on column public.date_poll_results.rank_reason is 'Human-readable summary of the deterministic algorithm ordering.';
