import { jsonResponse, optionsResponse } from '../_shared/cors.ts';
import { authenticateRequest, createServiceClient } from '../_shared/supabase.ts';

const taskSelect =
  'id, trip_id, created_by, assigned_to, title, description, status, due_at, completed_at, created_at, updated_at';
const taskStatuses = new Set(['pending', 'in_progress', 'done']);

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return optionsResponse();
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  try {
    const serviceClient = createServiceClient();
    const { userId } = await authenticateRequest(request, serviceClient);
    const input = parseUpdateTaskStatus(await request.json());

    const { data: existingTask, error: existingError } = await serviceClient
      .from('tasks')
      .select(taskSelect)
      .eq('id', input.taskId)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (!existingTask) {
      return jsonResponse({ error: 'Task not found.' }, 404);
    }

    const { data: isReadOnly, error: readOnlyError } = await serviceClient.rpc('is_trip_read_only', {
      target_trip_id: existingTask.trip_id,
    });

    if (readOnlyError) {
      throw new Error(readOnlyError.message);
    }

    if (isReadOnly === true) {
      return jsonResponse({ error: 'Closed trips are read-only.' }, 403);
    }

    const { data: isAdmin, error: adminError } = await serviceClient.rpc('is_trip_admin', {
      target_trip_id: existingTask.trip_id,
      target_user_id: userId,
    });

    if (adminError) {
      throw new Error(adminError.message);
    }

    const canUpdate =
      existingTask.created_by === userId || existingTask.assigned_to === userId || isAdmin === true;

    if (!canUpdate) {
      return jsonResponse({ error: 'Only the creator, assignee, or admin can update this task.' }, 403);
    }

    const completedAt = input.status === 'done' ? existingTask.completed_at ?? new Date().toISOString() : null;
    const { data: task, error: updateError } = await serviceClient
      .from('tasks')
      .update({
        status: input.status,
        completed_at: completedAt,
      })
      .eq('id', input.taskId)
      .select(taskSelect)
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    if (existingTask.status !== input.status) {
      await serviceClient.from('activity_log').insert({
        trip_id: task.trip_id,
        actor_user_id: userId,
        actor_type: 'user',
        event_type: task.status === 'done' ? 'task_completed' : 'task_status_changed',
        metadata: {
          task_id: task.id,
          title: task.title,
          previous_status: existingTask.status,
          new_status: task.status,
        },
      });
    }

    return jsonResponse({ task });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Task update failed.' }, 400);
  }
});

type UpdateTaskStatusInput = {
  taskId: string;
  status: 'pending' | 'in_progress' | 'done';
};

function parseUpdateTaskStatus(value: unknown): UpdateTaskStatusInput {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid request body.');
  }

  const body = value as Record<string, unknown>;

  if (typeof body.taskId !== 'string' || body.taskId.trim().length === 0) {
    throw new Error('Task id is required.');
  }

  if (typeof body.status !== 'string' || !taskStatuses.has(body.status)) {
    throw new Error('Status must be pending, in_progress, or done.');
  }

  return {
    taskId: body.taskId.trim(),
    status: body.status as UpdateTaskStatusInput['status'],
  };
}
