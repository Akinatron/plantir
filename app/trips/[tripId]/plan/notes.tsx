import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { FlatList, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../../../src/components/feedback/InlineNotice';
import { LoadingState } from '../../../../src/components/feedback/LoadingState';
import { PlaceholderState } from '../../../../src/components/feedback/PlaceholderState';
import { AppText } from '../../../../src/components/ui/AppText';
import { Button } from '../../../../src/components/ui/Button';
import { Screen } from '../../../../src/components/ui/Screen';
import { StateBanner } from '../../../../src/components/ui/StateBanner';
import { TextField } from '../../../../src/components/ui/TextField';
import { useAuth } from '../../../../src/features/auth/AuthProvider';
import { useCreatePlanningNoteMutation, usePlanningNotesQuery } from '../../../../src/hooks/usePlanning';
import { useTripQuery } from '../../../../src/hooks/useTrips';
import {
  CreatePlanningNoteFormValues,
  ParsedCreatePlanningNoteFormValues,
  createPlanningNoteSchema,
} from '../../../../src/lib/validation/planning';
import { PlanningNote } from '../../../../src/types/planning';

export default function NotesScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { user } = useAuth();
  const tripQuery = useTripQuery(tripId);
  const notesQuery = usePlanningNotesQuery(tripId);
  const createMutation = useCreatePlanningNoteMutation(tripId);
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreatePlanningNoteFormValues, unknown, ParsedCreatePlanningNoteFormValues>({
    resolver: zodResolver(createPlanningNoteSchema),
    defaultValues: {
      tripId,
      createdBy: user?.id ?? '',
      title: null,
      body: '',
      pinned: false,
    },
  });

  useEffect(() => {
    if (user?.id) {
      setValue('createdBy', user.id, { shouldValidate: true });
    }
  }, [setValue, user?.id]);

  if (tripQuery.isLoading || notesQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading notes..." />
      </Screen>
    );
  }

  const isReadOnly = Boolean(tripQuery.data?.closedAt);

  const onSubmit = handleSubmit(async (values) => {
    await createMutation.mutateAsync({
      ...values,
      tripId,
      createdBy: user?.id ?? values.createdBy,
    });
    reset({
      tripId,
      createdBy: user?.id ?? '',
      title: null,
      body: '',
      pinned: false,
    });
  });

  return (
    <Screen>
      <FlatList
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <AppText variant="eyebrow">Notes</AppText>
              <AppText variant="title">Shared notes</AppText>
            </View>
            {isReadOnly ? (
              <StateBanner title="Trip is read-only" message="Notes cannot be added while this trip is closed." tone="locked" />
            ) : null}
            {tripQuery.error ? (
              <InlineNotice title="Trip failed to load" message={tripQuery.error.message} tone="error" />
            ) : null}
            {notesQuery.error ? (
              <InlineNotice title="Notes failed to load" message={notesQuery.error.message} tone="error" />
            ) : null}
            {createMutation.error ? (
              <InlineNotice title="Note failed to save" message={createMutation.error.message} tone="error" />
            ) : null}
            {createMutation.isSuccess ? <InlineNotice title="Note added" tone="success" /> : null}
            <View style={styles.form}>
              <Controller
                control={control}
                name="title"
                render={({ field: { onBlur, onChange, value } }) => (
                  <TextField
                    label="Title"
                    onBlur={onBlur}
                    onChangeText={(text) => onChange(text)}
                    value={value ?? ''}
                    editable={!isReadOnly}
                    error={errors.title?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="body"
                render={({ field: { onBlur, onChange, value } }) => (
                  <TextField
                    label="Note"
                    multiline
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    editable={!isReadOnly}
                    error={errors.body?.message}
                  />
                )}
              />
              <Button
                label={createMutation.isPending ? 'Saving...' : 'Add note'}
                onPress={onSubmit}
                disabled={!user || isReadOnly || createMutation.isPending}
              />
            </View>
          </View>
        }
        contentContainerStyle={styles.list}
        data={notesQuery.data ?? []}
        keyExtractor={(note) => note.id}
        ListEmptyComponent={<PlaceholderState title="No notes yet" description="Add key details everyone should see." />}
        renderItem={({ item }) => <NoteCard note={item} />}
      />
    </Screen>
  );
}

function NoteCard({ note }: { note: PlanningNote }) {
  return (
    <View style={styles.card}>
      {note.title ? <AppText variant="subtitle">{note.title}</AppText> : null}
      <AppText>{note.body}</AppText>
      <AppText>Updated {new Date(note.updatedAt).toLocaleDateString()}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 16,
    paddingTop: 24,
  },
  form: {
    gap: 12,
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
