-- Phase 10: MVP destination/accommodation proposals, results, and selected proposal snapshot.

alter table public.destination_proposals
  add column price_per_person_cents integer,
  add column capacity integer,
  add column bedrooms numeric(4,1),
  add column bathrooms numeric(4,1),
  add column pros text[] not null default '{}',
  add column cons text[] not null default '{}',
  add constraint destination_proposals_price_per_person_non_negative check (
    price_per_person_cents is null or price_per_person_cents >= 0
  ),
  add constraint destination_proposals_capacity_positive check (capacity is null or capacity > 0),
  add constraint destination_proposals_bedrooms_non_negative check (bedrooms is null or bedrooms >= 0),
  add constraint destination_proposals_bathrooms_non_negative check (bathrooms is null or bathrooms >= 0);

alter table public.destination_proposals
  drop constraint destination_proposals_price_currency_pair,
  add constraint destination_proposals_price_currency_pair check (
    (
      estimated_price_cents is null
      and price_per_person_cents is null
      and currency_code is null
    )
    or (
      currency_code is not null
      and (
        estimated_price_cents is not null
        or price_per_person_cents is not null
      )
    )
  );

comment on column public.destination_proposals.price_per_person_cents is 'Optional normalized per-person estimate in integer cents.';
comment on column public.destination_proposals.capacity is 'Accommodation capacity as a whole number of guests.';
comment on column public.destination_proposals.pros is 'Short user-entered pros for comparison; stored as text array for MVP.';
comment on column public.destination_proposals.cons is 'Short user-entered cons for comparison; stored as text array for MVP.';

alter table public.trips
  add column selected_destination_proposal_id uuid references public.destination_proposals(id) on delete set null,
  add column selected_destination_snapshot jsonb,
  add constraint trips_selected_destination_snapshot_object check (
    selected_destination_snapshot is null or jsonb_typeof(selected_destination_snapshot) = 'object'
  );

comment on column public.trips.selected_destination_proposal_id is 'MVP selected accommodation proposal. Kept alongside final_destination_proposal_id for explicit product naming.';
comment on column public.trips.selected_destination_snapshot is 'Immutable-ish snapshot of the selected proposal data at the time the poll is closed.';

create table public.destination_poll_results (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  proposal_id uuid not null references public.destination_proposals(id) on delete cascade,
  vote_count integer not null,
  total_member_count integer not null,
  score integer not null,
  rank integer not null,
  is_winner boolean not null default false,
  is_tied_winner boolean not null default false,
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint destination_poll_results_vote_count_valid check (
    vote_count >= 0 and total_member_count >= 0 and vote_count <= total_member_count
  ),
  constraint destination_poll_results_rank_positive check (rank > 0)
);

comment on table public.destination_poll_results is 'Persisted destination proposal ranking. MVP uses single-choice votes: score equals vote count.';

alter table public.destination_poll_results enable row level security;

create index trips_selected_destination_proposal_id_idx on public.trips(selected_destination_proposal_id);
create index destination_poll_results_poll_id_idx on public.destination_poll_results(poll_id);
create index destination_poll_results_proposal_id_idx on public.destination_poll_results(proposal_id);
create unique index destination_poll_results_unique_rank_idx
  on public.destination_poll_results(poll_id, rank);

create policy "destination_poll_results_select_members"
on public.destination_poll_results for select to authenticated
using (
  exists (
    select 1 from public.polls p
    where p.id = destination_poll_results.poll_id
      and public.is_trip_member(p.trip_id, (select auth.uid()))
  )
);

-- No client write policies are created for destination_poll_results.
-- Edge Functions compute and close destination polls with the service role.
