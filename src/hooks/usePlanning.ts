import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  buildPlanningSummary,
  createPackingItem,
  createPlanningNote,
  createTask,
  listPackingItems,
  listPlanningNotes,
  listTasks,
  listTripFiles,
  togglePackingItem,
  updateTaskStatus,
} from '../services/planningService';
import {
  ParsedCreatePackingItemFormValues,
  ParsedCreatePlanningNoteFormValues,
  ParsedCreateTaskFormValues,
  UpdateTaskStatusFormValues,
} from '../lib/validation/planning';
import { PackingListItem } from '../types/planning';
import { tripQueryKey } from './useTrips';

export const tasksQueryKey = (tripId: string | null | undefined) => ['tasks', tripId] as const;
export const planningNotesQueryKey = (tripId: string | null | undefined) => ['planning-notes', tripId] as const;
export const packingItemsQueryKey = (tripId: string | null | undefined) => ['packing-items', tripId] as const;
export const tripFilesQueryKey = (tripId: string | null | undefined) => ['trip-files', tripId] as const;
export const planningSummaryQueryKey = (
  tripId: string | null | undefined,
  userId: string | null | undefined,
) => ['planning-summary', tripId, userId] as const;

export function useTasksQuery(tripId: string | null | undefined) {
  return useQuery({
    queryKey: tasksQueryKey(tripId),
    queryFn: () => {
      if (!tripId) {
        throw new Error('Cannot load tasks without a trip id.');
      }

      return listTasks(tripId);
    },
    enabled: Boolean(tripId),
  });
}

export function usePlanningNotesQuery(tripId: string | null | undefined) {
  return useQuery({
    queryKey: planningNotesQueryKey(tripId),
    queryFn: () => {
      if (!tripId) {
        throw new Error('Cannot load notes without a trip id.');
      }

      return listPlanningNotes(tripId);
    },
    enabled: Boolean(tripId),
  });
}

export function usePackingItemsQuery(tripId: string | null | undefined) {
  return useQuery({
    queryKey: packingItemsQueryKey(tripId),
    queryFn: () => {
      if (!tripId) {
        throw new Error('Cannot load packing items without a trip id.');
      }

      return listPackingItems(tripId);
    },
    enabled: Boolean(tripId),
  });
}

export function useTripFilesQuery(tripId: string | null | undefined) {
  return useQuery({
    queryKey: tripFilesQueryKey(tripId),
    queryFn: () => {
      if (!tripId) {
        throw new Error('Cannot load files without a trip id.');
      }

      return listTripFiles(tripId);
    },
    enabled: Boolean(tripId),
  });
}

export function usePlanningSummaryQuery(
  tripId: string | null | undefined,
  userId: string | null | undefined,
) {
  return useQuery({
    queryKey: planningSummaryQueryKey(tripId, userId),
    queryFn: async () => {
      if (!tripId || !userId) {
        throw new Error('Cannot load planning summary without a trip and user.');
      }

      const [tasks, packingItems] = await Promise.all([listTasks(tripId), listPackingItems(tripId)]);
      return buildPlanningSummary(tasks, packingItems, userId);
    },
    enabled: Boolean(tripId && userId),
  });
}

export function useCreateTaskMutation(tripId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: ParsedCreateTaskFormValues) => createTask(values),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey(task.tripId) });
      queryClient.invalidateQueries({ queryKey: planningSummaryQueryKey(task.tripId, undefined).slice(0, 2) });
      queryClient.invalidateQueries({ queryKey: tripQueryKey(task.tripId) });

      if (tripId && tripId !== task.tripId) {
        queryClient.invalidateQueries({ queryKey: tasksQueryKey(tripId) });
      }
    },
  });
}

export function useUpdateTaskStatusMutation(tripId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: UpdateTaskStatusFormValues) => updateTaskStatus(values),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey(task.tripId) });
      queryClient.invalidateQueries({ queryKey: planningSummaryQueryKey(task.tripId, undefined).slice(0, 2) });

      if (tripId && tripId !== task.tripId) {
        queryClient.invalidateQueries({ queryKey: tasksQueryKey(tripId) });
      }
    },
  });
}

export function useCreatePlanningNoteMutation(tripId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: ParsedCreatePlanningNoteFormValues) => createPlanningNote(values),
    onSuccess: (note) => {
      queryClient.invalidateQueries({ queryKey: planningNotesQueryKey(note.tripId) });

      if (tripId && tripId !== note.tripId) {
        queryClient.invalidateQueries({ queryKey: planningNotesQueryKey(tripId) });
      }
    },
  });
}

export function useCreatePackingItemMutation(tripId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: ParsedCreatePackingItemFormValues) => createPackingItem(values),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: packingItemsQueryKey(item.tripId) });
      queryClient.invalidateQueries({ queryKey: planningSummaryQueryKey(item.tripId, undefined).slice(0, 2) });

      if (tripId && tripId !== item.tripId) {
        queryClient.invalidateQueries({ queryKey: packingItemsQueryKey(tripId) });
      }
    },
  });
}

export function useTogglePackingItemMutation(tripId: string | null | undefined, userId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (item: PackingListItem) => {
      if (!userId) {
        throw new Error('Cannot update packing item without a user.');
      }

      return togglePackingItem(item, userId);
    },
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: packingItemsQueryKey(item.tripId) });
      queryClient.invalidateQueries({ queryKey: planningSummaryQueryKey(item.tripId, undefined).slice(0, 2) });

      if (tripId && tripId !== item.tripId) {
        queryClient.invalidateQueries({ queryKey: packingItemsQueryKey(tripId) });
      }
    },
  });
}
