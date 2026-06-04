import Constants from 'expo-constants';
import * as ExpoNotifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getSupabaseClient } from '../lib/supabase/client';
import {
  ActivityLogEvent,
  ActivityLogEventRow,
  Notification,
  NotificationPreference,
  NotificationPreferenceRow,
  PushPlatform,
  mapActivityLogEventRow,
  mapNotificationPreferenceRow,
  mapNotificationRow,
  NotificationRow,
} from '../types/notification';

const notificationSelect =
  'id, user_id, trip_id, title, body, status, metadata, read_at, sent_at, failed_at, created_at, updated_at';
const preferenceSelect =
  'user_id, in_app_enabled, push_enabled, muted_event_types, created_at, updated_at';
const activitySelect = 'id, trip_id, actor_user_id, actor_type, event_type, metadata, created_at';

export async function listNotifications(userId: string): Promise<Notification[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('notifications')
    .select(notificationSelect)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)
    .returns<NotificationRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapNotificationRow);
}

export async function markNotificationRead(notificationId: string): Promise<Notification> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('notifications')
    .update({ status: 'read', read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .select(notificationSelect)
    .single<NotificationRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapNotificationRow(data);
}

export async function dismissNotification(notificationId: string): Promise<Notification> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('notifications')
    .update({ status: 'dismissed' })
    .eq('id', notificationId)
    .select(notificationSelect)
    .single<NotificationRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapNotificationRow(data);
}

export async function getNotificationPreference(userId: string): Promise<NotificationPreference> {
  const supabase = getSupabaseClient();
  const { data: existing, error: existingError } = await supabase
    .from('notification_preferences')
    .select(preferenceSelect)
    .eq('user_id', userId)
    .maybeSingle<NotificationPreferenceRow>();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return mapNotificationPreferenceRow(existing);
  }

  const { data, error } = await supabase
    .from('notification_preferences')
    .insert({ user_id: userId })
    .select(preferenceSelect)
    .single<NotificationPreferenceRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapNotificationPreferenceRow(data);
}

export async function updateNotificationPreference(
  userId: string,
  values: Pick<NotificationPreference, 'inAppEnabled' | 'pushEnabled' | 'mutedEventTypes'>,
): Promise<NotificationPreference> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert(
      {
        user_id: userId,
        in_app_enabled: values.inAppEnabled,
        push_enabled: values.pushEnabled,
        muted_event_types: values.mutedEventTypes,
      },
      { onConflict: 'user_id' },
    )
    .select(preferenceSelect)
    .single<NotificationPreferenceRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapNotificationPreferenceRow(data);
}

export async function registerExpoPushToken(userId: string): Promise<string | null> {
  const permission = await ExpoNotifications.getPermissionsAsync();
  const finalPermission =
    permission.status === 'granted' ? permission : await ExpoNotifications.requestPermissionsAsync();

  if (finalPermission.status !== 'granted') {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  const tokenResponse = await ExpoNotifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  const token = tokenResponse.data;
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('push_tokens').upsert(
    {
      user_id: userId,
      platform: getPushPlatform(),
      token,
      device_id: Constants.sessionId ?? null,
      last_seen_at: new Date().toISOString(),
      revoked_at: null,
    },
    { onConflict: 'token' },
  );

  if (error) {
    throw new Error(error.message);
  }

  return token;
}

export async function listTripActivity(tripId: string): Promise<ActivityLogEvent[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('activity_log')
    .select(activitySelect)
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .limit(100)
    .returns<ActivityLogEventRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapActivityLogEventRow);
}

export async function logTripActivity(input: {
  tripId: string;
  eventType: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.functions.invoke('log-trip-activity', {
    body: input,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function sendTripNotification(input: {
  tripId: string;
  eventType: string;
  title: string;
  body: string;
  targetUserIds?: string[];
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.functions.invoke('send-trip-notification', {
    body: input,
  });

  if (error) {
    throw new Error(error.message);
  }
}

function getPushPlatform(): PushPlatform {
  if (Platform.OS === 'ios') {
    return 'ios';
  }

  if (Platform.OS === 'android') {
    return 'android';
  }

  return 'web';
}
