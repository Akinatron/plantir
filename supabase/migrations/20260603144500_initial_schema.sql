-- Plantir initial database schema.
-- Phase 4 intentionally creates tables, constraints, comments, triggers, and indexes only.
-- RLS policies are added in the next phase so schema and authorization can be reviewed separately.

create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.profile_status as enum ('active', 'deactivated');
create type public.trip_status as enum (
  'group_created',
  'voting_dates',
  'date_decided',
  'voting_place',
  'place_decided',
  'planning',
  'on_trip',
  'settling_expenses',
  'closed'
);
create type public.trip_member_role as enum ('owner', 'admin', 'member');
create type public.trip_member_status as enum ('joined', 'removed');
create type public.poll_type as enum ('date', 'destination');
create type public.poll_status as enum ('draft', 'active', 'closed', 'reopened');
create type public.task_status as enum ('todo', 'doing', 'done', 'cancelled');
create type public.expense_status as enum ('active', 'voided');
create type public.settlement_payment_status as enum ('pending', 'paid', 'cancelled');
create type public.push_platform as enum ('ios', 'android', 'web');
create type public.notification_status as enum ('pending', 'sent', 'read', 'dismissed', 'failed');
create type public.activity_actor_type as enum ('user', 'system');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  username citext unique,
  avatar_url text,
  timezone text not null default 'UTC',
  status public.profile_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint profiles_display_name_not_blank check (length(btrim(display_name)) > 0),
  constraint profiles_username_not_blank check (username is null or length(btrim(username::text)) > 0),
  constraint profiles_timezone_not_blank check (length(btrim(timezone)) > 0)
);

comment on table public.profiles is 'Public app profile linked 1:1 to auth.users. Timezone is stored separately from trips to avoid travel-date timezone ambiguity.';
comment on column public.profiles.deleted_at is 'Soft delete marker for account deletion workflows; auth user deletion may still cascade hard-delete in controlled flows.';

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  description text,
  timezone text not null,
  status public.trip_status not null default 'group_created',
  starts_on date,
  ends_on date,
  final_date_poll_result_id uuid,
  final_destination_proposal_id uuid,
  member_can_create_proposals boolean not null default true,
  member_can_create_expenses boolean not null default true,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint trips_title_not_blank check (length(btrim(title)) > 0),
  constraint trips_timezone_not_blank check (length(btrim(timezone)) > 0),
  constraint trips_date_range_valid check (starts_on is null or ends_on is null or starts_on <= ends_on),
  constraint trips_closed_status_consistent check (
    (status = 'closed' and closed_at is not null)
    or (status <> 'closed')
  )
);

comment on table public.trips is 'Core trip record. Travel days use date columns; precise lifecycle instants use timestamptz; trip timezone is explicit.';
comment on column public.trips.member_can_create_proposals is 'MVP setting: members can create accommodation proposals by default unless owner/admin disables it.';
comment on column public.trips.member_can_create_expenses is 'MVP setting: members can add expenses by default unless owner/admin disables it.';
comment on column public.trips.deleted_at is 'Soft delete marker so trip data can be hidden without immediately destroying audit-sensitive history.';

create table public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.trip_member_role not null default 'member',
  status public.trip_member_status not null default 'joined',
  joined_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_members_joined_at_required check (status <> 'joined' or joined_at is not null),
  constraint trip_members_removed_at_required check (status <> 'removed' or removed_at is not null)
);

comment on table public.trip_members is 'Membership is the tenant boundary for Plantir. RLS in the next phase will be based on this table.';

create table public.trip_invites (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  token_hash text not null unique,
  expires_at timestamptz,
  max_uses integer,
  use_count integer not null default 0,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint trip_invites_token_hash_not_blank check (length(btrim(token_hash)) > 0),
  constraint trip_invites_max_uses_positive check (max_uses is null or max_uses > 0),
  constraint trip_invites_use_count_non_negative check (use_count >= 0),
  constraint trip_invites_use_count_not_above_max check (max_uses is null or use_count <= max_uses)
);

comment on table public.trip_invites is 'Invite links store only token hashes. Raw tokens are returned once by Edge Functions and never stored.';

create table public.polls (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  type public.poll_type not null,
  status public.poll_status not null default 'draft',
  starts_on date,
  ends_on date,
  preferred_duration_days integer,
  created_by uuid not null references public.profiles(id) on delete restrict,
  closed_at timestamptz,
  reopened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint polls_date_range_valid check (starts_on is null or ends_on is null or starts_on <= ends_on),
  constraint polls_preferred_duration_positive check (preferred_duration_days is null or preferred_duration_days > 0)
);

comment on table public.polls is 'Shared poll table for date and destination phases. One active poll per type per trip is enforced with a partial unique index.';
comment on column public.polls.preferred_duration_days is 'Optional date poll setting used only as a deterministic tie-breaker after availability count and percentage.';

create table public.date_poll_allowed_ranges (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now(),
  constraint date_poll_allowed_ranges_valid check (starts_on <= ends_on)
);

comment on table public.date_poll_allowed_ranges is 'Date poll candidate windows. Travel days use date, not timestamptz.';

create table public.date_availability_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  available_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint date_availability_votes_unique unique (poll_id, user_id, available_on)
);

comment on table public.date_availability_votes is 'Only available days are stored. Missing rows mean unavailable in the MVP.';

create table public.date_poll_results (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  available_member_count integer not null,
  total_member_count integer not null,
  available_percentage numeric(6,5) not null,
  duration_days integer not null,
  preferred_duration_delta integer,
  score integer not null,
  rank integer not null,
  is_winner boolean not null default false,
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint date_poll_results_valid_range check (starts_on <= ends_on),
  constraint date_poll_results_counts_valid check (
    available_member_count >= 0
    and total_member_count >= 0
    and available_member_count <= total_member_count
  ),
  constraint date_poll_results_percentage_valid check (available_percentage >= 0 and available_percentage <= 1),
  constraint date_poll_results_duration_positive check (duration_days > 0),
  constraint date_poll_results_delta_non_negative check (preferred_duration_delta is null or preferred_duration_delta >= 0),
  constraint date_poll_results_rank_positive check (rank > 0)
);

comment on table public.date_poll_results is 'Stores ranked computed date ranges. Winner is automatic using deterministic tie-breakers, never manually chosen.';
comment on column public.date_poll_results.score is 'Integer score from the pure date poll algorithm, primarily availability count based.';

create table public.destination_proposals (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  poll_id uuid references public.polls(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  description text,
  url text,
  location_text text,
  estimated_price_cents integer,
  currency_code char(3),
  selected_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint destination_proposals_title_not_blank check (length(btrim(title)) > 0),
  constraint destination_proposals_price_non_negative check (estimated_price_cents is null or estimated_price_cents >= 0),
  constraint destination_proposals_currency_uppercase check (currency_code is null or currency_code = upper(currency_code)),
  constraint destination_proposals_price_currency_pair check (
    (estimated_price_cents is null and currency_code is null)
    or (estimated_price_cents is not null and currency_code is not null)
  )
);

comment on table public.destination_proposals is 'Accommodation or destination options. Money-like estimates use integer cents plus ISO 4217 currency.';

create table public.destination_proposal_images (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.destination_proposals(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint destination_proposal_images_storage_path_not_blank check (length(btrim(storage_path)) > 0),
  constraint destination_proposal_images_sort_order_non_negative check (sort_order >= 0)
);

comment on table public.destination_proposal_images is 'Stores Supabase Storage paths, not binary image data.';

create table public.destination_votes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  poll_id uuid not null references public.polls(id) on delete cascade,
  proposal_id uuid not null references public.destination_proposals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.destination_votes is 'MVP destination voting is single-choice: one proposal vote per member per destination poll.';

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  assigned_to uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  status public.task_status not null default 'todo',
  due_on date,
  completed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_title_not_blank check (length(btrim(title)) > 0),
  constraint tasks_completed_status_consistent check (
    (status = 'done' and completed_at is not null)
    or (status <> 'done')
  )
);

comment on table public.tasks is 'Planning tasks are V1 in product scope but included in the baseline schema to avoid later relationship churn.';

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  amount_cents integer not null,
  currency_code char(3) not null,
  expense_date date not null,
  status public.expense_status not null default 'active',
  voided_at timestamptz,
  voided_by uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expenses_title_not_blank check (length(btrim(title)) > 0),
  constraint expenses_amount_positive check (amount_cents > 0),
  constraint expenses_currency_uppercase check (currency_code = upper(currency_code)),
  constraint expenses_void_status_consistent check (
    (status = 'voided' and voided_at is not null)
    or (status = 'active' and voided_at is null)
  )
);

comment on table public.expenses is 'Expense header. Amount is stored as integer cents; exact payer and split rows are materialized separately.';

create table public.expense_payers (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  amount_cents integer not null,
  created_at timestamptz not null default now(),
  constraint expense_payers_amount_positive check (amount_cents > 0),
  constraint expense_payers_unique_user unique (expense_id, user_id)
);

comment on table public.expense_payers is 'Who paid for an expense. MVP usually has one payer, but multiple payer rows are supported.';

create table public.expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  amount_cents integer not null,
  created_at timestamptz not null default now(),
  constraint expense_splits_amount_positive check (amount_cents > 0),
  constraint expense_splits_unique_user unique (expense_id, user_id)
);

comment on table public.expense_splits is 'Exact owed share per member. Equal split with exclusions is converted into deterministic integer-cent rows.';

create table public.settlement_suggestions (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  from_user_id uuid not null references public.profiles(id) on delete restrict,
  to_user_id uuid not null references public.profiles(id) on delete restrict,
  amount_cents integer not null,
  currency_code char(3) not null,
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint settlement_suggestions_amount_positive check (amount_cents > 0),
  constraint settlement_suggestions_currency_uppercase check (currency_code = upper(currency_code)),
  constraint settlement_suggestions_distinct_users check (from_user_id <> to_user_id)
);

comment on table public.settlement_suggestions is 'Computed optimized payments to settle trip balances. Rows can be regenerated from expenses.';

create table public.settlement_payments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  suggestion_id uuid references public.settlement_suggestions(id) on delete set null,
  from_user_id uuid not null references public.profiles(id) on delete restrict,
  to_user_id uuid not null references public.profiles(id) on delete restrict,
  amount_cents integer not null,
  currency_code char(3) not null,
  status public.settlement_payment_status not null default 'pending',
  marked_paid_by uuid references public.profiles(id) on delete set null,
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint settlement_payments_amount_positive check (amount_cents > 0),
  constraint settlement_payments_currency_uppercase check (currency_code = upper(currency_code)),
  constraint settlement_payments_distinct_users check (from_user_id <> to_user_id),
  constraint settlement_payments_paid_status_consistent check (
    (status = 'paid' and paid_at is not null)
    or (status <> 'paid')
  ),
  constraint settlement_payments_cancelled_status_consistent check (
    (status = 'cancelled' and cancelled_at is not null)
    or (status <> 'cancelled')
  )
);

comment on table public.settlement_payments is 'Optional payment tracking record. Real payment processing is outside MVP.';

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  actor_type public.activity_actor_type not null default 'user',
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint activity_log_event_type_not_blank check (length(btrim(event_type)) > 0),
  constraint activity_log_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint activity_log_actor_consistent check (
    (actor_type = 'system' and actor_user_id is null)
    or (actor_type = 'user' and actor_user_id is not null)
  )
);

comment on table public.activity_log is 'Append-only trip activity feed. Clients should not directly write rows once RLS is added.';

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform public.push_platform not null,
  token text not null unique,
  device_id text,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_tokens_token_not_blank check (length(btrim(token)) > 0)
);

comment on table public.push_tokens is 'Push notification tokens are V1-ready. Tokens can be revoked without deleting history.';

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete cascade,
  title text not null,
  body text not null,
  status public.notification_status not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  sent_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notifications_title_not_blank check (length(btrim(title)) > 0),
  constraint notifications_body_not_blank check (length(btrim(body)) > 0),
  constraint notifications_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint notifications_read_status_consistent check (
    (status = 'read' and read_at is not null)
    or (status <> 'read')
  ),
  constraint notifications_sent_status_consistent check (
    (status = 'sent' and sent_at is not null)
    or (status <> 'sent')
  ),
  constraint notifications_failed_status_consistent check (
    (status = 'failed' and failed_at is not null)
    or (status <> 'failed')
  )
);

comment on table public.notifications is 'In-app notification records. Push delivery is handled separately through push_tokens and Edge Functions.';

alter table public.trips
  add constraint trips_final_date_poll_result_fk
  foreign key (final_date_poll_result_id)
  references public.date_poll_results(id)
  on delete set null;

alter table public.trips
  add constraint trips_final_destination_proposal_fk
  foreign key (final_destination_proposal_id)
  references public.destination_proposals(id)
  on delete set null;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create trigger trips_set_updated_at before update on public.trips
for each row execute function public.set_updated_at();

create trigger trip_members_set_updated_at before update on public.trip_members
for each row execute function public.set_updated_at();

create trigger trip_invites_set_updated_at before update on public.trip_invites
for each row execute function public.set_updated_at();

create trigger polls_set_updated_at before update on public.polls
for each row execute function public.set_updated_at();

create trigger date_availability_votes_set_updated_at before update on public.date_availability_votes
for each row execute function public.set_updated_at();

create trigger destination_proposals_set_updated_at before update on public.destination_proposals
for each row execute function public.set_updated_at();

create trigger destination_proposal_images_set_updated_at before update on public.destination_proposal_images
for each row execute function public.set_updated_at();

create trigger destination_votes_set_updated_at before update on public.destination_votes
for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at before update on public.tasks
for each row execute function public.set_updated_at();

create trigger expenses_set_updated_at before update on public.expenses
for each row execute function public.set_updated_at();

create trigger settlement_payments_set_updated_at before update on public.settlement_payments
for each row execute function public.set_updated_at();

create trigger push_tokens_set_updated_at before update on public.push_tokens
for each row execute function public.set_updated_at();

create trigger notifications_set_updated_at before update on public.notifications
for each row execute function public.set_updated_at();

create index profiles_status_idx on public.profiles(status);
create index profiles_deleted_at_idx on public.profiles(deleted_at) where deleted_at is not null;

create index trips_owner_id_idx on public.trips(owner_id);
create index trips_status_idx on public.trips(status);
create index trips_deleted_at_idx on public.trips(deleted_at) where deleted_at is not null;
create index trips_final_date_poll_result_id_idx on public.trips(final_date_poll_result_id);
create index trips_final_destination_proposal_id_idx on public.trips(final_destination_proposal_id);

create index trip_members_trip_id_idx on public.trip_members(trip_id);
create index trip_members_user_id_idx on public.trip_members(user_id);
create index trip_members_user_status_idx on public.trip_members(user_id, status);
create index trip_members_trip_role_idx on public.trip_members(trip_id, role) where status = 'joined';
create unique index trip_members_unique_joined_member_idx
  on public.trip_members(trip_id, user_id)
  where status = 'joined';
create unique index trip_members_one_owner_per_trip_idx
  on public.trip_members(trip_id)
  where role = 'owner' and status = 'joined';

create index trip_invites_trip_id_idx on public.trip_invites(trip_id);
create index trip_invites_created_by_idx on public.trip_invites(created_by);
create index trip_invites_expires_at_idx on public.trip_invites(expires_at) where expires_at is not null;
create index trip_invites_active_idx on public.trip_invites(trip_id, revoked_at, expires_at) where deleted_at is null;

create index polls_trip_id_idx on public.polls(trip_id);
create index polls_created_by_idx on public.polls(created_by);
create index polls_trip_type_status_idx on public.polls(trip_id, type, status);
create unique index polls_one_active_type_per_trip_idx
  on public.polls(trip_id, type)
  where status in ('active', 'reopened') and deleted_at is null;

create index date_poll_allowed_ranges_poll_id_idx on public.date_poll_allowed_ranges(poll_id);
create index date_poll_allowed_ranges_dates_idx on public.date_poll_allowed_ranges(poll_id, starts_on, ends_on);

create index date_availability_votes_poll_id_idx on public.date_availability_votes(poll_id);
create index date_availability_votes_user_id_idx on public.date_availability_votes(user_id);
create index date_availability_votes_poll_date_idx on public.date_availability_votes(poll_id, available_on);

create index date_poll_results_poll_id_idx on public.date_poll_results(poll_id);
create unique index date_poll_results_unique_rank_idx on public.date_poll_results(poll_id, rank);
create unique index date_poll_results_one_winner_idx
  on public.date_poll_results(poll_id)
  where is_winner;

create index destination_proposals_trip_id_idx on public.destination_proposals(trip_id);
create index destination_proposals_poll_id_idx on public.destination_proposals(poll_id);
create index destination_proposals_created_by_idx on public.destination_proposals(created_by);
create index destination_proposals_not_deleted_idx on public.destination_proposals(trip_id, created_at) where deleted_at is null;

create index destination_proposal_images_proposal_id_idx on public.destination_proposal_images(proposal_id);
create index destination_proposal_images_created_by_idx on public.destination_proposal_images(created_by);
create index destination_proposal_images_not_deleted_idx on public.destination_proposal_images(proposal_id, sort_order) where deleted_at is null;

create index destination_votes_trip_id_idx on public.destination_votes(trip_id);
create index destination_votes_poll_id_idx on public.destination_votes(poll_id);
create index destination_votes_proposal_id_idx on public.destination_votes(proposal_id);
create index destination_votes_user_id_idx on public.destination_votes(user_id);
create unique index destination_votes_one_vote_per_member_idx
  on public.destination_votes(trip_id, poll_id, user_id);

create index tasks_trip_id_idx on public.tasks(trip_id);
create index tasks_created_by_idx on public.tasks(created_by);
create index tasks_assigned_to_idx on public.tasks(assigned_to);
create index tasks_status_idx on public.tasks(trip_id, status) where deleted_at is null;

create index expenses_trip_id_idx on public.expenses(trip_id);
create index expenses_created_by_idx on public.expenses(created_by);
create index expenses_trip_status_date_idx on public.expenses(trip_id, status, expense_date);
create index expenses_not_deleted_idx on public.expenses(trip_id, expense_date) where deleted_at is null;
create index expenses_voided_by_idx on public.expenses(voided_by) where voided_by is not null;

create index expense_payers_expense_id_idx on public.expense_payers(expense_id);
create index expense_payers_user_id_idx on public.expense_payers(user_id);

create index expense_splits_expense_id_idx on public.expense_splits(expense_id);
create index expense_splits_user_id_idx on public.expense_splits(user_id);

create index settlement_suggestions_trip_id_idx on public.settlement_suggestions(trip_id);
create index settlement_suggestions_from_user_id_idx on public.settlement_suggestions(from_user_id);
create index settlement_suggestions_to_user_id_idx on public.settlement_suggestions(to_user_id);
create index settlement_suggestions_trip_currency_idx on public.settlement_suggestions(trip_id, currency_code);

create index settlement_payments_trip_id_idx on public.settlement_payments(trip_id);
create index settlement_payments_suggestion_id_idx on public.settlement_payments(suggestion_id);
create index settlement_payments_from_user_id_idx on public.settlement_payments(from_user_id);
create index settlement_payments_to_user_id_idx on public.settlement_payments(to_user_id);
create index settlement_payments_status_idx on public.settlement_payments(trip_id, status);
create index settlement_payments_marked_paid_by_idx on public.settlement_payments(marked_paid_by) where marked_paid_by is not null;

create index activity_log_trip_id_created_at_idx on public.activity_log(trip_id, created_at desc);
create index activity_log_actor_user_id_idx on public.activity_log(actor_user_id) where actor_user_id is not null;
create index activity_log_event_type_idx on public.activity_log(event_type);
create index activity_log_metadata_gin_idx on public.activity_log using gin(metadata);

create index push_tokens_user_id_idx on public.push_tokens(user_id);
create index push_tokens_active_idx on public.push_tokens(user_id, platform) where revoked_at is null;

create index notifications_user_id_idx on public.notifications(user_id);
create index notifications_trip_id_idx on public.notifications(trip_id) where trip_id is not null;
create index notifications_user_status_created_at_idx on public.notifications(user_id, status, created_at desc);
create index notifications_metadata_gin_idx on public.notifications using gin(metadata);
