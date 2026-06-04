export type TaskStatus = 'pending' | 'in_progress' | 'done';

export type Task = {
  id: string;
  tripId: string;
  createdBy: string;
  assignedTo: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskRow = {
  id: string;
  trip_id: string;
  created_by: string;
  assigned_to: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PlanningNote = {
  id: string;
  tripId: string;
  createdBy: string;
  title: string | null;
  body: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PlanningNoteRow = {
  id: string;
  trip_id: string;
  created_by: string;
  title: string | null;
  body: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type PackingListItem = {
  id: string;
  tripId: string;
  createdBy: string;
  assignedTo: string | null;
  label: string;
  quantity: number;
  isPacked: boolean;
  packedBy: string | null;
  packedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PackingListItemRow = {
  id: string;
  trip_id: string;
  created_by: string;
  assigned_to: string | null;
  label: string;
  quantity: number;
  is_packed: boolean;
  packed_by: string | null;
  packed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TripFile = {
  name: string;
  path: string;
  size: number | null;
  updatedAt: string | null;
};

export type TripPlanningSummary = {
  pendingTasks: number;
  assignedToMe: number;
  missingItems: number;
  overdueTasks: number;
};

export function mapTaskRow(row: TaskRow): Task {
  return {
    id: row.id,
    tripId: row.trip_id,
    createdBy: row.created_by,
    assignedTo: row.assigned_to,
    title: row.title,
    description: row.description,
    status: row.status,
    dueAt: row.due_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPlanningNoteRow(row: PlanningNoteRow): PlanningNote {
  return {
    id: row.id,
    tripId: row.trip_id,
    createdBy: row.created_by,
    title: row.title,
    body: row.body,
    pinned: row.pinned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPackingListItemRow(row: PackingListItemRow): PackingListItem {
  return {
    id: row.id,
    tripId: row.trip_id,
    createdBy: row.created_by,
    assignedTo: row.assigned_to,
    label: row.label,
    quantity: row.quantity,
    isPacked: row.is_packed,
    packedBy: row.packed_by,
    packedAt: row.packed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
