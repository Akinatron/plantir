import { useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../../src/components/feedback/InlineNotice';
import { LoadingState } from '../../../src/components/feedback/LoadingState';
import { PlaceholderState } from '../../../src/components/feedback/PlaceholderState';
import { AppText } from '../../../src/components/ui/AppText';
import { Screen } from '../../../src/components/ui/Screen';
import { useTripActivityQuery } from '../../../src/hooks/useNotifications';
import { formatCents } from '../../../src/lib/algorithms/money';
import { ActivityLogEvent } from '../../../src/types/notification';

export default function TripActivityScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const activityQuery = useTripActivityQuery(tripId);

  if (activityQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading activity..." />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant="eyebrow">Activity</AppText>
            <AppText variant="title">Trip activity</AppText>
            {activityQuery.error ? (
              <InlineNotice title="Activity failed to load" message={activityQuery.error.message} tone="error" />
            ) : null}
          </View>
        }
        contentContainerStyle={styles.list}
        data={activityQuery.data ?? []}
        keyExtractor={(event) => event.id}
        ListEmptyComponent={
          <PlaceholderState title="No activity yet" description="Important trip changes will appear here." />
        }
        renderItem={({ item }) => <ActivityCard event={item} />}
      />
    </Screen>
  );
}

function ActivityCard({ event }: { event: ActivityLogEvent }) {
  return (
    <View style={styles.card}>
      <AppText variant="subtitle">{activityTitle(event)}</AppText>
      <AppText>{new Date(event.createdAt).toLocaleString()}</AppText>
      {activityDetail(event) ? <AppText>{activityDetail(event)}</AppText> : null}
    </View>
  );
}

function activityTitle(event: ActivityLogEvent): string {
  const labels: Record<string, string> = {
    trip_created: 'Trip created',
    member_joined: 'Member joined',
    trip_member_joined: 'Member joined',
    date_poll_created: 'Date poll created',
    date_vote_submitted: 'Date vote submitted',
    date_chosen: 'Date chosen',
    date_poll_closed: 'Date chosen',
    destination_proposal_created: 'Destination proposal created',
    destination_vote_submitted: 'Destination vote submitted',
    destination_chosen: 'Destination chosen',
    destination_poll_closed: 'Destination chosen',
    expense_created: 'Expense created',
    settlement_marked_paid: 'Settlement marked paid',
    settlement_payment_marked_paid: 'Settlement marked paid',
    task_created: 'Task created',
    task_completed: 'Task completed',
    task_status_changed: 'Task updated',
  };

  return labels[event.eventType] ?? event.eventType.replaceAll('_', ' ');
}

function activityDetail(event: ActivityLogEvent): string | null {
  const metadata = event.metadata;
  const title = metadata.title;

  if (typeof title === 'string' && title.length > 0) {
    return title;
  }

  const startsOn = metadata.starts_on;
  const endsOn = metadata.ends_on;

  if (typeof startsOn === 'string' && typeof endsOn === 'string') {
    return `${startsOn} to ${endsOn}`;
  }

  const amount = metadata.amount_cents;
  const currency = metadata.currency_code;

  if (typeof amount === 'number' && typeof currency === 'string') {
    return formatCents(amount, currency);
  }

  return null;
}

const styles = StyleSheet.create({
  header: {
    gap: 12,
    paddingTop: 24,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAECF0',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
});
