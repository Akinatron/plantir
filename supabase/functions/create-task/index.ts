import { jsonResponse, optionsResponse } from '../_shared/cors.ts';
import { authenticateRequest, createServiceClient } from '../_shared/supabase.ts';

const taskSelect =
  'id, trip_id, created_by, assigned_to, title, description, status, due_at, completed_at, created_at, updated_at';

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
    const input = parseCreateTask(await request.json(), userId);

    const { data: isMember, error: memberError } = await serviceClient.rpc('is_trip_member', {
      target_trip_id: input.tripId,
      target_user_id: userId,
    });

    if (memberError) {
      throw new Error(memberError.message);
    }

    if (isMember !== true) {
      return jsonResponse({ error: 'Only trip members can create tasks.' }, 403);
    }

    const { data: isReadOnly, error: readOnlyError } = await serviceClient.rpc('is_trip_read_only', {
      target_trip_id: input.tripId,
    });

    if (readOnlyError) {
      throw new Error(readOnlyError.message);
    }

    if (isReadOnly === true) {
      return jsonResponse({ error: 'Closed trips are read-only.' }, 403);
    }

    if (input.assignedTo) {
      const { data: assigneeIsMember, error: assigneeError } = await serviceClient.rpc('is_trip_member', {
        target_trip_id: input.tripId,
        target_user_id: input.assignedTo,
      });

      if (assigneeError) {
        throw new Error(assigneeError.message);
      }

      if (assigneeIsMember !== true) {
        return jsonResponse({ error: 'Assignee must be a trip member.' }, 400);
      }
    }

    const { data: task, error: taskError } = await serviceClient
      .from('tasks')
      .insert({
        trip_id: input.tripId,
        created_by: userId,
        assigned_to: input.assignedTo,
        title: input.title,
        description: input.description,
        status: 'pending',
        due_at: input.dueAt,
      })
      .select(taskSelect)
      .single();

    if (taskError) {
      throw new Error(taskError.message);
    }

    await serviceClient.from('activity_log').insert({
      trip_id: input.tripId,
      actor_user_id: userId,
      actor_type: 'user',
      event_type: 'task_created',
      metadata: {
        task_id: task.id,
        title: task.title,
        assigned_to: task.assigned_to,
        due_at: task.due_at,
      },
    });

    return jsonResponse({ task });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Task creation failed.' }, 400);
  }
});

type CreateTaskInput = {
  tripId: string;
  title: string;
  description: string | null;
  assignedTo: string | null;
  dueAt: string | null;
};

function parseCreateTask(value: unknown, userId: string): CreateTaskInput {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid request body.');
  }

  const body = value as Record<string, unknown>;
  const createdBy = readOptionalString(body.createdBy);

  if (createdBy && createdBy !== userId) {
    throw new Error('Cannot create a task for another user.');
  }

  const title = readRequiredString(body.title, 'Title');
  const dueAt = readOptionalString(body.dueAt);

  if (dueAt && Number.isNaN(Date.parse(dueAt))) {
    throw new Error('Due date is invalid.');
  }

  return {
    tripId: readRequiredString(body.tripId, 'Trip id'),
    title,
    description: readOptionalString(body.description),
    assignedTo: readOptionalString(body.assignedTo),
    dueAt: dueAt ? new Date(dueAt).toISOString() : null,
  };
}

function readRequiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}

function readOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
