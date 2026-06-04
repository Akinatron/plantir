import { getSupabaseClient } from '../lib/supabase/client';
import {
  ParsedCreatePackingItemFormValues,
  ParsedCreatePlanningNoteFormValues,
  ParsedCreateTaskFormValues,
  UpdateTaskStatusFormValues,
} from '../lib/validation/planning';
import {
  PackingListItem,
  PackingListItemRow,
  PlanningNote,
  PlanningNoteRow,
  Task,
  TaskRow,
  TripFile,
  TripPlanningSummary,
  mapPackingListItemRow,
  mapPlanningNoteRow,
  mapTaskRow,
} from '../types/planning';

const taskSelect =
  'id, trip_id, created_by, assigned_to, title, description, status, due_at, completed_at, created_at, updated_at';
const noteSelect = 'id, trip_id, created_by, title, body, pinned, created_at, updated_at';
const packingSelect =
  'id, trip_id, created_by, assigned_to, label, quantity, is_packed, packed_by, packed_at, created_at, updated_at';

export async function listTasks(tripId: string): Promise<Task[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('tasks')
    .select(taskSelect)
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .order('status', { ascending: true })
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .returns<TaskRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapTaskRow);
}

export async function createTask(values: ParsedCreateTaskFormValues): Promise<Task> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke<{ task: TaskRow }>('create-task', {
    body: values,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Task function returned no data.');
  }

  return mapTaskRow(data.task);
}

export async function updateTaskStatus(values: UpdateTaskStatusFormValues): Promise<Task> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke<{ task: TaskRow }>('update-task-status', {
    body: values,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Task status function returned no data.');
  }

  return mapTaskRow(data.task);
}

export async function listPlanningNotes(tripId: string): Promise<PlanningNote[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('planning_notes')
    .select(noteSelect)
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })
    .returns<PlanningNoteRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapPlanningNoteRow);
}

export async function createPlanningNote(values: ParsedCreatePlanningNoteFormValues): Promise<PlanningNote> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('planning_notes')
    .insert({
      trip_id: values.tripId,
      created_by: values.createdBy,
      title: values.title,
      body: values.body,
      pinned: values.pinned,
    })
    .select(noteSelect)
    .single<PlanningNoteRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapPlanningNoteRow(data);
}

export async function listPackingItems(tripId: string): Promise<PackingListItem[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('packing_list_items')
    .select(packingSelect)
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .order('is_packed', { ascending: true })
    .order('created_at', { ascending: false })
    .returns<PackingListItemRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapPackingListItemRow);
}

export async function createPackingItem(values: ParsedCreatePackingItemFormValues): Promise<PackingListItem> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('packing_list_items')
    .insert({
      trip_id: values.tripId,
      created_by: values.createdBy,
      label: values.label,
      quantity: values.quantity,
      assigned_to: values.assignedTo,
    })
    .select(packingSelect)
    .single<PackingListItemRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapPackingListItemRow(data);
}

export async function togglePackingItem(item: PackingListItem, userId: string): Promise<PackingListItem> {
  const supabase = getSupabaseClient();
  const nextPacked = !item.isPacked;
  const { data, error } = await supabase
    .from('packing_list_items')
    .update({
      is_packed: nextPacked,
      packed_by: nextPacked ? userId : null,
      packed_at: nextPacked ? new Date().toISOString() : null,
    })
    .eq('id', item.id)
    .select(packingSelect)
    .single<PackingListItemRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapPackingListItemRow(data);
}

export async function listTripFiles(tripId: string): Promise<TripFile[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage.from('trip-files').list(tripId, {
    limit: 50,
    sortBy: { column: 'updated_at', order: 'desc' },
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .filter((file) => file.name !== '.emptyFolderPlaceholder')
    .map((file) => ({
      name: file.name,
      path: `${tripId}/${file.name}`,
      size: typeof file.metadata?.size === 'number' ? file.metadata.size : null,
      updatedAt: file.updated_at ?? null,
    }));
}

export function buildPlanningSummary(tasks: Task[], packingItems: PackingListItem[], userId: string): TripPlanningSummary {
  const now = Date.now();
  const openTasks = tasks.filter((task) => task.status !== 'done');

  return {
    pendingTasks: openTasks.length,
    assignedToMe: openTasks.filter((task) => task.assignedTo === userId).length,
    missingItems: packingItems.filter((item) => !item.isPacked).length,
    overdueTasks: openTasks.filter((task) => task.dueAt !== null && Date.parse(task.dueAt) < now).length,
  };
}
