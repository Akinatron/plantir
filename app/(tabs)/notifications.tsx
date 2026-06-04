import { FlatList, Pressable, StyleSheet, Switch, View } from 'react-native';

import { InlineNotice } from '../../src/components/feedback/InlineNotice';
import { LoadingState } from '../../src/components/feedback/LoadingState';
import { PlaceholderState } from '../../src/components/feedback/PlaceholderState';
import { AppText } from '../../src/components/ui/AppText';
import { Button } from '../../src/components/ui/Button';
import { Screen } from '../../src/components/ui/Screen';
import { useAuth } from '../../src/features/auth/AuthProvider';
import {
  useDismissNotificationMutation,
  useMarkNotificationReadMutation,
  useNotificationPreferenceQuery,
  useNotificationsQuery,
  useRegisterPushTokenMutation,
  useUpdateNotificationPreferenceMutation,
} from '../../src/hooks/useNotifications';
import { Notification } from '../../src/types/notification';

export default function NotificationsTabScreen() {
  const { user } = useAuth();
  const notificationsQuery = useNotificationsQuery(user?.id);
  const preferenceQuery = useNotificationPreferenceQuery(user?.id);
  const updatePreference = useUpdateNotificationPreferenceMutation(user?.id);
  const registerPush = useRegisterPushTokenMutation(user?.id);
  const markRead = useMarkNotificationReadMutation(user?.id);
  const dismiss = useDismissNotificationMutation(user?.id);

  if (notificationsQuery.isLoading || preferenceQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading notifications..." />
      </Screen>
    );
  }

  const preference = preferenceQuery.data;

  return (
    <Screen>
      <FlatList
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <AppText variant="eyebrow">Notifications</AppText>
              <AppText variant="title">Inbox</AppText>
            </View>

            {notificationsQuery.error ? (
              <InlineNotice title="Notifications failed to load" message={notificationsQuery.error.message} tone="error" />
            ) : null}
            {preferenceQuery.error ? (
              <InlineNotice title="Preferences failed to load" message={preferenceQuery.error.message} tone="error" />
            ) : null}
            {updatePreference.error ? (
              <InlineNotice title="Preferences failed to save" message={updatePreference.error.message} tone="error" />
            ) : null}
            {registerPush.error ? (
              <InlineNotice title="Push setup failed" message={registerPush.error.message} tone="error" />
            ) : null}

            {preference ? (
              <View style={styles.panel}>
                <AppText variant="eyebrow">Preferences</AppText>
                <PreferenceRow
                  label="In-app notifications"
                  value={preference.inAppEnabled}
                  disabled={updatePreference.isPending}
                  onChange={(inAppEnabled) =>
                    updatePreference.mutate({
                      inAppEnabled,
                      pushEnabled: preference.pushEnabled,
                      mutedEventTypes: preference.mutedEventTypes,
                    })
                  }
                />
                <PreferenceRow
                  label="Push notifications"
                  value={preference.pushEnabled}
                  disabled={updatePreference.isPending}
                  onChange={(pushEnabled) =>
                    updatePreference.mutate({
                      inAppEnabled: preference.inAppEnabled,
                      pushEnabled,
                      mutedEventTypes: preference.mutedEventTypes,
                    })
                  }
                />
                <Button
                  label={registerPush.isPending ? 'Registering...' : 'Enable push on this device'}
                  onPress={() => registerPush.mutate()}
                  disabled={!user || registerPush.isPending || !preference.pushEnabled}
                  variant="secondary"
                />
              </View>
            ) : null}
          </View>
        }
        contentContainerStyle={styles.list}
        data={notificationsQuery.data ?? []}
        keyExtractor={(notification) => notification.id}
        ListEmptyComponent={
          <PlaceholderState title="No notifications" description="Trip updates will appear here when there is something useful." />
        }
        renderItem={({ item }) => (
          <NotificationCard
            notification={item}
            disabled={markRead.isPending || dismiss.isPending}
            onRead={() => markRead.mutate(item.id)}
            onDismiss={() => dismiss.mutate(item.id)}
          />
        )}
      />
    </Screen>
  );
}

function PreferenceRow({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.preferenceRow}>
      <AppText>{label}</AppText>
      <Switch value={value} disabled={disabled} onValueChange={onChange} />
    </View>
  );
}

function NotificationCard({
  notification,
  disabled,
  onRead,
  onDismiss,
}: {
  notification: Notification;
  disabled: boolean;
  onRead: () => void;
  onDismiss: () => void;
}) {
  const unread = notification.status === 'pending' || notification.status === 'sent';

  return (
    <View style={[styles.card, unread && styles.unreadCard]}>
      <View style={styles.cardHeader}>
        <AppText variant="subtitle">{notification.title}</AppText>
        <AppText>{new Date(notification.createdAt).toLocaleDateString()}</AppText>
      </View>
      <AppText>{notification.body}</AppText>
      <View style={styles.actionRow}>
        {unread ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Mark ${notification.title} as read`}
            disabled={disabled}
            onPress={onRead}
            style={styles.textButton}
          >
            <AppText style={styles.textButtonLabel}>Mark read</AppText>
          </Pressable>
        ) : null}
        {notification.status !== 'dismissed' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Dismiss ${notification.title}`}
            disabled={disabled}
            onPress={onDismiss}
            style={styles.textButton}
          >
            <AppText style={styles.textButtonLabel}>Dismiss</AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 16,
    paddingTop: 24,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
  panel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAECF0',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  preferenceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAECF0',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  unreadCard: {
    borderColor: '#0F6B57',
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  textButton: {
    alignItems: 'center',
    borderColor: '#D0D5DD',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  textButtonLabel: {
    color: '#0F6B57',
    fontWeight: '700',
  },
});
