import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ScrollView, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../../src/components/feedback/InlineNotice';
import { LoadingState } from '../../../src/components/feedback/LoadingState';
import { AppText } from '../../../src/components/ui/AppText';
import { Button } from '../../../src/components/ui/Button';
import { Screen } from '../../../src/components/ui/Screen';
import { TextField } from '../../../src/components/ui/TextField';
import { useTripQuery, useUpdateTripSettingsMutation } from '../../../src/hooks/useTrips';
import { TripSettingsFormValues, tripSettingsSchema } from '../../../src/lib/validation/trip';

export default function TripSettingsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const tripQuery = useTripQuery(tripId);
  const updateMutation = useUpdateTripSettingsMutation(tripId);
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<TripSettingsFormValues>({
    resolver: zodResolver(tripSettingsSchema),
    defaultValues: {
      title: '',
      description: null,
      timezone: 'UTC',
      memberCanCreateProposals: true,
      memberCanCreateExpenses: true,
      memberCanSeeDateResults: true,
      memberCanSeePlaceResults: true,
      memberCanModifyPlaceFields: false,
      settlementMarkPaidPolicy: 'participants',
    },
  });
  const memberCanCreateProposals = useWatch({ control, name: 'memberCanCreateProposals' });
  const memberCanCreateExpenses = useWatch({ control, name: 'memberCanCreateExpenses' });
  const memberCanSeeDateResults = useWatch({ control, name: 'memberCanSeeDateResults' });
  const memberCanSeePlaceResults = useWatch({ control, name: 'memberCanSeePlaceResults' });
  const memberCanModifyPlaceFields = useWatch({ control, name: 'memberCanModifyPlaceFields' });
  const settlementMarkPaidPolicy = useWatch({ control, name: 'settlementMarkPaidPolicy' });

  useEffect(() => {
    if (tripQuery.data) {
      reset({
        title: tripQuery.data.title,
        description: tripQuery.data.description,
        timezone: tripQuery.data.timezone,
        memberCanCreateProposals: tripQuery.data.memberCanCreateProposals,
        memberCanCreateExpenses: tripQuery.data.memberCanCreateExpenses,
        memberCanSeeDateResults: tripQuery.data.memberCanSeeDateResults,
        memberCanSeePlaceResults: tripQuery.data.memberCanSeePlaceResults,
        memberCanModifyPlaceFields: tripQuery.data.memberCanModifyPlaceFields,
        settlementMarkPaidPolicy: tripQuery.data.settlementMarkPaidPolicy,
      });
    }
  }, [reset, tripQuery.data]);

  if (tripQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading settings..." />
      </Screen>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    const updated = await updateMutation.mutateAsync(values);
    reset({
      title: updated.title,
      description: updated.description,
      timezone: updated.timezone,
      memberCanCreateProposals: updated.memberCanCreateProposals,
      memberCanCreateExpenses: updated.memberCanCreateExpenses,
      memberCanSeeDateResults: updated.memberCanSeeDateResults,
      memberCanSeePlaceResults: updated.memberCanSeePlaceResults,
      memberCanModifyPlaceFields: updated.memberCanModifyPlaceFields,
      settlementMarkPaidPolicy: updated.settlementMarkPaidPolicy,
    });
  });

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <AppText variant="eyebrow">Settings</AppText>
          <AppText variant="title">Trip basics</AppText>
        </View>

        {tripQuery.error ? (
          <InlineNotice title="Settings failed to load" message={tripQuery.error.message} tone="error" />
        ) : null}

        {updateMutation.error ? (
          <InlineNotice title="Settings failed to save" message={updateMutation.error.message} tone="error" />
        ) : null}

        {updateMutation.isSuccess ? <InlineNotice title="Settings saved" tone="success" /> : null}

        <View style={styles.form}>
          <Controller
            control={control}
            name="title"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                label="Trip name"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
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
                onChangeText={(text) => onChange(text.trim().length > 0 ? text : null)}
                value={value ?? ''}
                error={errors.description?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="timezone"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                label="Timezone"
                autoCapitalize="none"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.timezone?.message}
              />
            )}
          />
        </View>

        <ToggleRow
          label="Members can create proposals"
          value={memberCanCreateProposals}
          onToggle={() =>
            setValue('memberCanCreateProposals', !memberCanCreateProposals, {
              shouldDirty: true,
            })
          }
        />
        <ToggleRow
          label="Members can add expenses"
          value={memberCanCreateExpenses}
          onToggle={() =>
            setValue('memberCanCreateExpenses', !memberCanCreateExpenses, {
              shouldDirty: true,
            })
          }
        />
        <ToggleRow
          label="Members can see date results"
          value={memberCanSeeDateResults}
          onToggle={() =>
            setValue('memberCanSeeDateResults', !memberCanSeeDateResults, {
              shouldDirty: true,
            })
          }
        />
        <ToggleRow
          label="Members can see place results"
          value={memberCanSeePlaceResults}
          onToggle={() =>
            setValue('memberCanSeePlaceResults', !memberCanSeePlaceResults, {
              shouldDirty: true,
            })
          }
        />
        <ToggleRow
          label="Members can edit place fields"
          value={memberCanModifyPlaceFields}
          onToggle={() =>
            setValue('memberCanModifyPlaceFields', !memberCanModifyPlaceFields, {
              shouldDirty: true,
            })
          }
        />
        <ToggleRow
          label="Members can mark own settlements paid"
          value={settlementMarkPaidPolicy === 'participants'}
          onToggle={() =>
            setValue(
              'settlementMarkPaidPolicy',
              settlementMarkPaidPolicy === 'participants' ? 'owner_admin_only' : 'participants',
              {
                shouldDirty: true,
              },
            )
          }
        />

        <Button
          label={updateMutation.isPending ? 'Saving...' : 'Save settings'}
          onPress={onSubmit}
          disabled={!isDirty || updateMutation.isPending}
        />
      </ScrollView>
    </Screen>
  );
}

function ToggleRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <View style={styles.toggleRow}>
      <AppText>{label}</AppText>
      <Button label={value ? 'On' : 'Off'} variant="secondary" onPress={onToggle} />
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
  form: {
    gap: 16,
  },
  toggleRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EAECF0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
});
