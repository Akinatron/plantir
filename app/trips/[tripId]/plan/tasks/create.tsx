import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../../../../src/components/feedback/InlineNotice';
import { LoadingState } from '../../../../../src/components/feedback/LoadingState';
import { AppText } from '../../../../../src/components/ui/AppText';
import { Button } from '../../../../../src/components/ui/Button';
import { Screen } from '../../../../../src/components/ui/Screen';
import { TextField } from '../../../../../src/components/ui/TextField';
import { useAuth } from '../../../../../src/features/auth/AuthProvider';
import { useCreateTaskMutation } from '../../../../../src/hooks/usePlanning';
import { useTripMembersQuery } from '../../../../../src/hooks/useTrips';
import {
  CreateTaskFormValues,
  ParsedCreateTaskFormValues,
  createTaskSchema,
} from '../../../../../src/lib/validation/planning';
import { TripMember } from '../../../../../src/types/trip';

export default function CreateTaskScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { user } = useAuth();
  const membersQuery = useTripMembersQuery(tripId);
  const createMutation = useCreateTaskMutation(tripId);
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateTaskFormValues, unknown, ParsedCreateTaskFormValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      tripId,
      createdBy: user?.id ?? '',
      title: '',
      description: null,
      assignedTo: null,
      dueAt: null,
    },
  });
  const assignedTo = useWatch({ control, name: 'assignedTo' });

  if (membersQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading members..." />
      </Screen>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    await createMutation.mutateAsync({
      ...values,
      tripId,
      createdBy: user?.id ?? values.createdBy,
    });
    router.replace(`/trips/${tripId}/plan/tasks`);
  });

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <AppText variant="eyebrow">Task</AppText>
          <AppText variant="title">Create task</AppText>
        </View>

        {createMutation.error ? (
          <InlineNotice title="Task failed to save" message={createMutation.error.message} tone="error" />
        ) : null}

        <View style={styles.form}>
          <Controller
            control={control}
            name="title"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField label="Title" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.title?.message} />
            )}
          />
          <Controller
            control={control}
            name="description"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                label="Description"
                multiline
                onBlur={onBlur}
                onChangeText={(text) => onChange(text)}
                value={value ?? ''}
                error={errors.description?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="dueAt"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                label="Due date/time"
                placeholder="2026-07-01T10:00:00Z"
                onBlur={onBlur}
                onChangeText={(text) => onChange(text)}
                value={value ?? ''}
                error={errors.dueAt?.message}
              />
            )}
          />
        </View>

        <View style={styles.section}>
          <AppText variant="subtitle">Assignee</AppText>
          <Pressable
            style={[styles.memberRow, assignedTo === null && styles.memberRowSelected]}
            onPress={() => setValue('assignedTo', null, { shouldDirty: true })}
          >
            <AppText>Unassigned</AppText>
            <AppText>{assignedTo === null ? 'Selected' : 'Select'}</AppText>
          </Pressable>
          {(membersQuery.data ?? []).map((member) => (
            <SelectableMember
              key={member.id}
              member={member}
              selected={assignedTo === member.userId}
              onPress={() => setValue('assignedTo', member.userId, { shouldDirty: true })}
            />
          ))}
          {errors.assignedTo ? <AppText>{errors.assignedTo.message}</AppText> : null}
        </View>

        <Button
          label={createMutation.isPending ? 'Saving...' : 'Save task'}
          onPress={onSubmit}
          disabled={!user || createMutation.isPending}
        />
      </ScrollView>
    </Screen>
  );
}

function SelectableMember({
  member,
  selected,
  onPress,
}: {
  member: TripMember;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.memberRow, selected && styles.memberRowSelected]} onPress={onPress}>
      <View>
        <AppText variant="subtitle">{member.displayName ?? 'Unnamed member'}</AppText>
        <AppText>{member.role}</AppText>
      </View>
      <AppText>{selected ? 'Selected' : 'Select'}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
    paddingVertical: 24,
  },
  header: {
    gap: 8,
  },
  form: {
    gap: 14,
  },
  section: {
    gap: 10,
  },
  memberRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EAECF0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  memberRowSelected: {
    borderColor: '#0F6B57',
  },
});
