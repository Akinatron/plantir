import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  dismissNotification,
  getNotificationPreference,
  listNotifications,
  listTripActivity,
  markNotificationRead,
  registerExpoPushToken,
  updateNotificationPreference,
} from '../services/notificationService';
import { NotificationPreference } from '../types/notification';

export const notificationsQueryKey = (userId: string | null | undefined) => ['notifications', userId] as const;
export const notificationPreferenceQueryKey = (userId: string | null | undefined) =>
  ['notification-preference', userId] as const;
export const tripActivityQueryKey = (tripId: string | null | undefined) => ['trip-activity', tripId] as const;

export function useNotificationsQuery(userId: string | null | undefined) {
  return useQuery({
    queryKey: notificationsQueryKey(userId),
    queryFn: () => {
      if (!userId) {
        throw new Error('Cannot load notifications without a user id.');
      }

      return listNotifications(userId);
    },
    enabled: Boolean(userId),
  });
}

export function useNotificationPreferenceQuery(userId: string | null | undefined) {
  return useQuery({
    queryKey: notificationPreferenceQueryKey(userId),
    queryFn: () => {
      if (!userId) {
        throw new Error('Cannot load notification preferences without a user id.');
      }

      return getNotificationPreference(userId);
    },
    enabled: Boolean(userId),
  });
}

export function useTripActivityQuery(tripId: string | null | undefined) {
  return useQuery({
    queryKey: tripActivityQueryKey(tripId),
    queryFn: () => {
      if (!tripId) {
        throw new Error('Cannot load activity without a trip id.');
      }

      return listTripActivity(tripId);
    },
    enabled: Boolean(tripId),
  });
}

export function useMarkNotificationReadMutation(userId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey(userId) });
    },
  });
}

export function useDismissNotificationMutation(userId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => dismissNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey(userId) });
    },
  });
}

export function useUpdateNotificationPreferenceMutation(userId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      values: Pick<NotificationPreference, 'inAppEnabled' | 'pushEnabled' | 'mutedEventTypes'>,
    ) => {
      if (!userId) {
        throw new Error('Cannot update notification preferences without a user id.');
      }

      return updateNotificationPreference(userId, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationPreferenceQueryKey(userId) });
    },
  });
}

export function useRegisterPushTokenMutation(userId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!userId) {
        throw new Error('Cannot register push token without a user id.');
      }

      return registerExpoPushToken(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationPreferenceQueryKey(userId) });
    },
  });
}
