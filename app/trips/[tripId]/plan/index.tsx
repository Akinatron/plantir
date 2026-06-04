import { Link, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../../../src/components/feedback/InlineNotice';
import { LoadingState } from '../../../../src/components/feedback/LoadingState';
import { AppText } from '../../../../src/components/ui/AppText';
import { Button } from '../../../../src/components/ui/Button';
import { Card } from '../../../../src/components/ui/Card';
import { PageHeader } from '../../../../src/components/ui/PageHeader';
import { Screen } from '../../../../src/components/ui/Screen';
import { StatTile } from '../../../../src/components/ui/StatTile';
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
        <PageHeader eyebrow="Planning" title="Trip plan" description="Keep the practical details visible after the big decisions are made." />

        {summaryQuery.error ? (
          <InlineNotice title="Plan failed to load" message={summaryQuery.error.message} tone="error" />
        ) : null}

        <View style={styles.summaryGrid}>
          <StatTile label="Pending tasks" value={summary?.pendingTasks ?? 0} />
          <StatTile label="Assigned to me" value={summary?.assignedToMe ?? 0} />
          <StatTile label="Missing items" value={summary?.missingItems ?? 0} />
          <StatTile label="Overdue" value={summary?.overdueTasks ?? 0} />
        </View>

        <Card>
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
        </Card>

        <Card>
          <AppText variant="eyebrow">Files</AppText>
          <AppText>{fileCount} shared file{fileCount === 1 ? '' : 's'} in trip storage.</AppText>
          {filesQuery.error ? <AppText>{filesQuery.error.message}</AppText> : null}
        </Card>

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

const styles = StyleSheet.create({
  content: {
    gap: 18,
    paddingVertical: 24,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actions: {
    gap: 12,
  },
});
