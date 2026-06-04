export type NotificationStatus = 'pending' | 'sent' | 'read' | 'dismissed' | 'failed';
export type PushPlatform = 'ios' | 'android' | 'web';

export type Notification = {
  id: string;
  userId: string;
  tripId: string | null;
  title: string;
  body: string;
  status: NotificationStatus;
  metadata: Record<string, unknown>;
  readAt: string | null;
  sentAt: string | null;
  failedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  trip_id: string | null;
  title: string;
  body: string;
  status: NotificationStatus;
  metadata: Record<string, unknown>;
  read_at: string | null;
  sent_at: string | null;
  failed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationPreference = {
  userId: string;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  mutedEventTypes: string[];
  createdAt: string;
  updatedAt: string;
};

export type NotificationPreferenceRow = {
  user_id: string;
  in_app_enabled: boolean;
  push_enabled: boolean;
  muted_event_types: string[];
  created_at: string;
  updated_at: string;
};

export type ActivityLogEvent = {
  id: string;
  tripId: string;
  actorUserId: string | null;
  actorType: 'user' | 'system';
  eventType: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ActivityLogEventRow = {
  id: string;
  trip_id: string;
  actor_user_id: string | null;
  actor_type: 'user' | 'system';
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export function mapNotificationRow(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    tripId: row.trip_id,
    title: row.title,
    body: row.body,
    status: row.status,
    metadata: row.metadata,
    readAt: row.read_at,
    sentAt: row.sent_at,
    failedAt: row.failed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapNotificationPreferenceRow(row: NotificationPreferenceRow): NotificationPreference {
  return {
    userId: row.user_id,
    inAppEnabled: row.in_app_enabled,
    pushEnabled: row.push_enabled,
    mutedEventTypes: row.muted_event_types,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapActivityLogEventRow(row: ActivityLogEventRow): ActivityLogEvent {
  return {
    id: row.id,
    tripId: row.trip_id,
    actorUserId: row.actor_user_id,
    actorType: row.actor_type,
    eventType: row.event_type,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}
