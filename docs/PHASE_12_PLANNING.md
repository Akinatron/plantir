# Phase 12: Planning, Tasks, Notes, and Lists

## Implemented scope

- Trip plan dashboard with pending tasks, assigned-to-me tasks, missing packing items, overdue tasks, and basic files count.
- Tasks screen with `pending`, `in_progress`, and `done` statuses.
- Create task screen with title, description, assignee, and `due_at`.
- Notes screen for shared trip notes.
- Packing/shared list screen with quantity, owner, and packed/missing toggle.
- Basic files screen backed by the existing `trip-files` Supabase Storage bucket list operation.
- Edge Functions for task creation and task status changes so activity log rows are written server-side.

## Database changes

- Renamed active task enum values from `todo` to `pending` and `doing` to `in_progress`.
- Added `tasks.due_at` while keeping `due_on` for compatibility with earlier migrations.
- Added `planning_notes`.
- Added `packing_list_items`.
- Added indexes for trip-scoped planning reads, open packing items, and task due dates.
- Added RLS for notes and packing items.

## Security and RLS

- Tasks keep the Phase 5 RLS policies: members can read, members can create, and creator/assignee/admin can update.
- Task creation and status updates use Edge Functions for activity logging and repeat the critical permission checks.
- Notes are readable by trip members and writable by members while the trip is not read-only.
- Notes can be edited/deleted by the creator or owner/admin.
- Packing items are readable and updatable by trip members while the trip is not read-only.
- Closed trips remain read-only through the existing `is_trip_read_only` helper.

## Activity log

Server-side activity log events:

- `task_created`
- `task_status_changed`

Direct client writes to `activity_log` remain blocked.

## MVP limitations

- No rich itinerary timeline yet.
- No task comments yet; the existing schema does not support them cleanly.
- Files are list-only in this phase. Upload UX can be added later with document picker support and the existing `trip-files` bucket policies.
- Notes and packing changes do not write activity log events in MVP.
