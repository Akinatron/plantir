import { Link, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../../../../src/components/feedback/InlineNotice';
import { LoadingState } from '../../../../../src/components/feedback/LoadingState';
import { PlaceholderState } from '../../../../../src/components/feedback/PlaceholderState';
import { AppText } from '../../../../../src/components/ui/AppText';
import { Button } from '../../../../../src/components/ui/Button';
import { Screen } from '../../../../../src/components/ui/Screen';
import { StateBanner } from '../../../../../src/components/ui/StateBanner';
import { useTasksQuery, useUpdateTaskStatusMutation } from '../../../../../src/hooks/usePlanning';
import { useTripMembersQuery, useTripQuery } from '../../../../../src/hooks/useTrips';
import { Task, TaskStatus } from '../../../../../src/types/planning';
import { TripMember } from '../../../../../src/types/trip';

const statuses: TaskStatus[] = ['pending', 'in_progress', 'done'];

export default function TasksScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const tripQuery = useTripQuery(tripId);
  const tasksQuery = useTasksQuery(tripId);
  const membersQuery = useTripMembersQuery(tripId);
  const statusMutation = useUpdateTaskStatusMutation(tripId);

  if (tripQuery.isLoading || tasksQuery.isLoading || membersQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading tasks..." />
      </Screen>
    );
  }

  const members = membersQuery.data ?? [];
  const isReadOnly = Boolean(tripQuery.data?.closedAt);

  return (
    <Screen>
      <FlatList
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <AppText variant="eyebrow">Tasks</AppText>
              <AppText variant="title">Planning tasks</AppText>
            </View>
            {isReadOnly ? (
              <StateBanner title="Trip is read-only" message="Tasks cannot be changed while this trip is closed." tone="locked" />
            ) : null}
            {tripQuery.error ? (
              <InlineNotice title="Trip failed to load" message={tripQuery.error.message} tone="error" />
            ) : null}
            {tasksQuery.error ? (
              <InlineNotice title="Tasks failed to load" message={tasksQuery.error.message} tone="error" />
            ) : null}
            {membersQuery.error ? (
              <InlineNotice title="Members failed to load" message={membersQuery.error.message} tone="error" />
            ) : null}
            {statusMutation.error ? (
              <InlineNotice title="Task update failed" message={statusMutation.error.message} tone="error" />
            ) : null}
            {statusMutation.isSuccess ? <InlineNotice title="Task updated" tone="success" /> : null}
            {isReadOnly ? (
              <Button label="Create task" disabled />
            ) : (
              <Link href={`/trips/${tripId}/plan/tasks/create`} asChild>
                <Button label="Create task" />
              </Link>
            )}
          </View>
        }
        contentContainerStyle={styles.list}
        data={tasksQuery.data ?? []}
        keyExtractor={(task) => task.id}
        ListEmptyComponent={<PlaceholderState title="No tasks yet" description="Create the first planning task." />}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            members={members}
            disabled={isReadOnly || statusMutation.isPending}
            onStatusChange={(status) => statusMutation.mutate({ taskId: item.id, status })}
          />
        )}
      />
    </Screen>
  );
}

function TaskCard({
  task,
  members,
  disabled,
  onStatusChange,
}: {
  task: Task;
  members: TripMember[];
  disabled: boolean;
  onStatusChange: (status: TaskStatus) => void;
}) {
  const assignee = members.find((member) => member.userId === task.assignedTo);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <AppText variant="subtitle">{task.title}</AppText>
        <AppText>{task.status.replace('_', ' ')}</AppText>
      </View>
      {task.description ? <AppText>{task.description}</AppText> : null}
      <AppText>Assigned to {assignee?.displayName ?? 'Unassigned'}</AppText>
      {task.dueAt ? <AppText>Due {new Date(task.dueAt).toLocaleString()}</AppText> : null}
      <View style={styles.statusRow}>
        {statuses.map((status) => (
          <Pressable
            key={status}
            accessibilityRole="button"
            accessibilityLabel={`Set ${task.title} to ${status.replace('_', ' ')}`}
            accessibilityState={{ disabled: disabled || task.status === status, selected: task.status === status }}
            disabled={disabled || task.status === status}
            onPress={() => onStatusChange(status)}
            style={[styles.statusButton, task.status === status && styles.statusButtonActive]}
          >
            <AppText style={task.status === status ? styles.statusTextActive : styles.statusText}>
              {status.replace('_', ' ')}
            </AppText>
          </Pressable>
        ))}
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
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAECF0',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    alignItems: 'center',
    borderColor: '#D0D5DD',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statusButtonActive: {
    backgroundColor: '#0F6B57',
    borderColor: '#0F6B57',
  },
  statusText: {
    color: '#344054',
  },
  statusTextActive: {
    color: '#FFFFFF',
  },
});
