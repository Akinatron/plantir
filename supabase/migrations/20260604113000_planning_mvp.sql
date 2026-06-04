-- Phase 12: post-decision planning MVP.
-- Tasks already existed in the baseline schema; this migration aligns task status names
-- with the product language and adds small planning tables for notes and shared lists.

alter type public.task_status rename value 'todo' to 'pending';
alter type public.task_status rename value 'doing' to 'in_progress';

alter table public.tasks alter column status set default 'pending';
alter table public.tasks
  add column if not exists due_at timestamptz;

update public.tasks
set due_at = due_on::timestamptz
where due_at is null and due_on is not null;

comment on column public.tasks.due_at is 'Task deadline instant for planning reminders. due_on is kept for backwards compatibility with earlier migrations.';

create table public.planning_notes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text,
  body text not null,
  pinned boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planning_notes_title_not_blank check (title is null or length(btrim(title)) > 0),
  constraint planning_notes_body_not_blank check (length(btrim(body)) > 0)
);

comment on table public.planning_notes is 'MVP shared notes for trip planning. Itinerary-specific rich scheduling remains outside MVP.';

create table public.packing_list_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  assigned_to uuid references public.profiles(id) on delete set null,
  label text not null,
  quantity integer not null default 1,
  is_packed boolean not null default false,
  packed_by uuid references public.profiles(id) on delete set null,
  packed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint packing_list_items_label_not_blank check (length(btrim(label)) > 0),
  constraint packing_list_items_quantity_positive check (quantity > 0),
  constraint packing_list_items_packed_consistent check (
    (is_packed = true and packed_at is not null)
    or (is_packed = false)
  )
);

comment on table public.packing_list_items is 'Shared MVP checklist for packing and missing items.';

create trigger planning_notes_set_updated_at before update on public.planning_notes
for each row execute function public.set_updated_at();

create trigger packing_list_items_set_updated_at before update on public.packing_list_items
for each row execute function public.set_updated_at();

create index planning_notes_trip_id_idx on public.planning_notes(trip_id);
create index planning_notes_pinned_idx on public.planning_notes(trip_id, pinned, updated_at desc) where deleted_at is null;
create index packing_list_items_trip_id_idx on public.packing_list_items(trip_id);
create index packing_list_items_assigned_to_idx on public.packing_list_items(assigned_to) where deleted_at is null;
create index packing_list_items_missing_idx on public.packing_list_items(trip_id, is_packed) where deleted_at is null;
create index tasks_due_at_idx on public.tasks(trip_id, due_at) where deleted_at is null and due_at is not null;

alter table public.planning_notes enable row level security;
alter table public.packing_list_items enable row level security;

create policy "planning_notes_select_members"
on public.planning_notes for select to authenticated
using (public.is_trip_member(trip_id, (select auth.uid())));

create policy "planning_notes_insert_members"
on public.planning_notes for insert to authenticated
with check (
  created_by = (select auth.uid())
  and public.is_trip_member(trip_id, (select auth.uid()))
  and not public.is_trip_read_only(trip_id)
);

create policy "planning_notes_update_creator_or_admin"
on public.planning_notes for update to authenticated
using (
  public.is_trip_member(trip_id, (select auth.uid()))
  and not public.is_trip_read_only(trip_id)
  and (created_by = (select auth.uid()) or public.is_trip_admin(trip_id, (select auth.uid())))
)
with check (
  public.is_trip_member(trip_id, (select auth.uid()))
  and (created_by = (select auth.uid()) or public.is_trip_admin(trip_id, (select auth.uid())))
);

create policy "planning_notes_delete_creator_or_admin"
on public.planning_notes for delete to authenticated
using (
  not public.is_trip_read_only(trip_id)
  and (created_by = (select auth.uid()) or public.is_trip_admin(trip_id, (select auth.uid())))
);

create policy "packing_list_items_select_members"
on public.packing_list_items for select to authenticated
using (public.is_trip_member(trip_id, (select auth.uid())));

create policy "packing_list_items_insert_members"
on public.packing_list_items for insert to authenticated
with check (
  created_by = (select auth.uid())
  and public.is_trip_member(trip_id, (select auth.uid()))
  and not public.is_trip_read_only(trip_id)
);

create policy "packing_list_items_update_members"
on public.packing_list_items for update to authenticated
using (
  public.is_trip_member(trip_id, (select auth.uid()))
  and not public.is_trip_read_only(trip_id)
)
with check (public.is_trip_member(trip_id, (select auth.uid())));

create policy "packing_list_items_delete_creator_or_admin"
on public.packing_list_items for delete to authenticated
using (
  not public.is_trip_read_only(trip_id)
  and (created_by = (select auth.uid()) or public.is_trip_admin(trip_id, (select auth.uid())))
);
