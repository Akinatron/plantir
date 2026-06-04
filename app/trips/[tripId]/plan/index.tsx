import { Link, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../../../src/components/feedback/InlineNotice';
import { LoadingState } from '../../../../src/components/feedback/LoadingState';
import { AppText } from '../../../../src/components/ui/AppText';
import { Button } from '../../../../src/components/ui/Button';
import { Screen } from '../../../../src/components/ui/Screen';
import { useAuth } from '../../../../src/features/auth/AuthProvider';
import {
  usePackingItemsQuery,
  usePlanningSummaryQuery,
  useTasksQuery,
  useTripFilesQuery,
} from '../../../../src/hooks/usePlanning';

export default function TripPlanScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { user } = useAuth();
  const summaryQuery = usePlanningSummaryQuery(tripId, user?.id);
  const tasksQuery = useTasksQuery(tripId);
  const packingQuery = usePackingItemsQuery(tripId);
  const filesQuery = useTripFilesQuery(tripId);

  if (summaryQuery.isLoading || tasksQuery.isLoading || packingQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading plan..." />
      </Screen>
    );
  }

  const summary = summaryQuery.data;
  const missingTasks = (tasksQuery.data ?? []).filter((task) => task.status !== 'done').slice(0, 3);
  const missingItems = (packingQuery.data ?? []).filter((item) => !item.isPacked).slice(0, 3);
  const fileCount = filesQuery.data?.length ?? 0;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <AppText variant="eyebrow">Planning</AppText>
          <AppText variant="title">Trip plan</AppText>
        </View>

        {summaryQuery.error ? (
          <InlineNotice title="Plan failed to load" message={summaryQuery.error.message} tone="error" />
        ) : null}

        <View style={styles.summaryGrid}>
          <SummaryCard label="Pending tasks" value={summary?.pendingTasks ?? 0} />
          <SummaryCard label="Assigned to me" value={summary?.assignedToMe ?? 0} />
          <SummaryCard label="Missing items" value={summary?.missingItems ?? 0} />
          <SummaryCard label="Overdue" value={summary?.overdueTasks ?? 0} />
        </View>

        <View style={styles.panel}>
          <AppText variant="eyebrow">Before the trip</AppText>
          {missingTasks.length === 0 && missingItems.length === 0 ? (
            <AppText>No open tasks or missing packing items.</AppText>
          ) : null}
          {missingTasks.map((task) => (
            <AppText key={task.id}>Task: {task.title}</AppText>
          ))}
          {missingItems.map((item) => (
            <AppText key={item.id}>Pack: {item.label}</AppText>
          ))}
        </View>

        <View style={styles.panel}>
          <AppText variant="eyebrow">Files</AppText>
          <AppText>{fileCount} shared file{fileCount === 1 ? '' : 's'} in trip storage.</AppText>
          {filesQuery.error ? <AppText>{filesQuery.error.message}</AppText> : null}
        </View>

        <View style={styles.actions}>
          <Link href={`/trips/${tripId}/plan/tasks`} asChild>
            <Button label="Tasks" />
          </Link>
          <Link href={`/trips/${tripId}/plan/tasks/create`} asChild>
            <Button label="Create task" variant="secondary" />
          </Link>
          <Link href={`/trips/${tripId}/plan/notes`} asChild>
            <Button label="Notes" variant="secondary" />
          </Link>
          <Link href={`/trips/${tripId}/plan/packing`} asChild>
            <Button label="Packing list" variant="secondary" />
          </Link>
          <Link href={`/trips/${tripId}/plan/files`} asChild>
            <Button label="Files" variant="secondary" />
          </Link>
        </View>
      </ScrollView>
    </Screen>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.summaryCard}>
      <AppText variant="title">{value}</AppText>
      <AppText>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 18,
    paddingVertical: 24,
  },
  header: {
    gap: 8,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAECF0',
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: '47%',
    gap: 6,
    padding: 14,
  },
  panel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAECF0',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  actions: {
    gap: 12,
  },
});
