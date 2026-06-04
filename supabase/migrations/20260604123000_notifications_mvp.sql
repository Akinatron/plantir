-- Phase 13: notification preferences and notification delivery helpers.

create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  in_app_enabled boolean not null default true,
  push_enabled boolean not null default true,
  muted_event_types text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.notification_preferences is 'MVP user-level notification preferences. Email is intentionally outside MVP.';
comment on column public.notification_preferences.muted_event_types is 'Optional event type denylist for noisy notification categories.';

create trigger notification_preferences_set_updated_at before update on public.notification_preferences
for each row execute function public.set_updated_at();

create index notification_preferences_push_enabled_idx
  on public.notification_preferences(user_id)
  where push_enabled = true;

alter table public.notification_preferences enable row level security;

create policy "notification_preferences_select_own"
on public.notification_preferences for select to authenticated
using (user_id = (select auth.uid()));

create policy "notification_preferences_insert_own"
on public.notification_preferences for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "notification_preferences_update_own"
on public.notification_preferences for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "notification_preferences_delete_own"
on public.notification_preferences for delete to authenticated
using (user_id = (select auth.uid()));

comment on policy "notifications_update_own_status" on public.notifications is 'Users can mark their own notifications read or dismissed. Inserts are service-role only.';
