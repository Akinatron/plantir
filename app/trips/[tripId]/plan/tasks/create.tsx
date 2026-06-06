import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../../../../src/components/feedback/InlineNotice';
import { LoadingState } from '../../../../../src/components/feedback/LoadingState';
import { AppText } from '../../../../../src/components/ui/AppText';
import { Button } from '../../../../../src/components/ui/Button';
import { CalendarDateTimeField } from '../../../../../src/components/ui/CalendarDateField';
import { ErrorState } from '../../../../../src/components/ui/ErrorState';
import { Screen } from '../../../../../src/components/ui/Screen';
import { StateBanner } from '../../../../../src/components/ui/StateBanner';
import { TextField } from '../../../../../src/components/ui/TextField';
import { useAuth } from '../../../../../src/features/auth/AuthProvider';
import { useCreateTaskMutation } from '../../../../../src/hooks/usePlanning';
import { useTripMembersQuery, useTripQuery } from '../../../../../src/hooks/useTrips';
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
  const tripQuery = useTripQuery(tripId);
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

  useEffect(() => {
    if (user?.id) {
      setValue('createdBy', user.id, { shouldValidate: true });
    }
  }, [setValue, user?.id]);

  if (tripQuery.isLoading || membersQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading members..." />
      </Screen>
    );
  }

  if (tripQuery.isError) {
    return (
      <Screen centered>
        <ErrorState title="Trip failed to load" message={tripQuery.error.message} />
      </Screen>
    );
  }

  if (membersQuery.isError) {
    return (
      <Screen centered>
        <ErrorState title="Members failed to load" message={membersQuery.error.message} />
      </Screen>
    );
  }

  const isReadOnly = Boolean(tripQuery.data?.closedAt);
  const formDisabled = isReadOnly || createMutation.isPending;

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

        {isReadOnly ? (
          <StateBanner title="Trip is read-only" message="Tasks cannot be created while this trip is closed." tone="locked" />
        ) : null}

        {createMutation.error ? (
          <InlineNotice title="Task failed to save" message={createMutation.error.message} tone="error" />
        ) : null}

        <View style={styles.form}>
          <Controller
            control={control}
            name="title"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                label="Title"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                editable={!formDisabled}
                error={errors.title?.message}
              />
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
                editable={!formDisabled}
                error={errors.description?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="dueAt"
            render={({ field: { onChange, value } }) => (
              <CalendarDateTimeField
                label="Due date"
                value={value ?? ''}
                onChange={onChange}
                disabled={formDisabled}
                error={errors.dueAt?.message}
              />
            )}
          />
        </View>

        <View style={styles.section}>
          <AppText variant="subtitle">Assignee</AppText>
          <Pressable
            style={[styles.memberRow, assignedTo === null && styles.memberRowSelected, formDisabled && styles.disabled]}
            disabled={formDisabled}
            accessibilityState={{ disabled: formDisabled, selected: assignedTo === null }}
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
              disabled={formDisabled}
              onPress={() => setValue('assignedTo', member.userId, { shouldDirty: true })}
            />
          ))}
          {errors.assignedTo ? <AppText>{errors.assignedTo.message}</AppText> : null}
        </View>

        <Button
          label={createMutation.isPending ? 'Saving...' : 'Save task'}
          onPress={onSubmit}
          disabled={!user || formDisabled}
        />
      </ScrollView>
    </Screen>
  );
}

function SelectableMember({
  member,
  selected,
  disabled,
  onPress,
}: {
  member: TripMember;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.memberRow, selected && styles.memberRowSelected, disabled && styles.disabled]}
      disabled={disabled}
      accessibilityState={{ disabled, selected }}
      onPress={onPress}
    >
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
  disabled: {
    opacity: 0.55,
  },
});
