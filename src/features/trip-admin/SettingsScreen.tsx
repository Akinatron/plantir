import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, RotateCcw, Save, ShieldCheck } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Screen } from '../../components/ui/Screen';
import { TextArea } from '../../components/ui/TextArea';
import { TextField } from '../../components/ui/TextField';
import { ToggleRow } from '../../components/ui/ToggleRow';
import { StateBanner } from '../../components/ui/StateBanner';
import { colors } from '../../design/theme';
import { spacing } from '../../design/spacing';
import {
  useCloseTripMutation,
  useConfirmTripMutation,
  useReopenTripMutation,
  useTripMembersQuery,
  useTripQuery,
  useUpdateTripSettingsMutation,
} from '../../hooks/useTrips';
import { confirmAction } from '../../lib/ui/confirmAction';
import { TripSettingsFormValues, tripSettingsSchema } from '../../lib/validation/trip';
import { canManageTrip, formatInstant, visibleTripState } from './adminUtils';

type SettingsScreenProps = {
  tripId: string;
};

export function SettingsScreen({ tripId }: SettingsScreenProps) {
  const { user } = useAuth();
  const tripQuery = useTripQuery(tripId);
  const membersQuery = useTripMembersQuery(tripId);
  const updateMutation = useUpdateTripSettingsMutation(tripId);
  const confirmTripMutation = useConfirmTripMutation(tripId);
  const closeTripMutation = useCloseTripMutation(tripId);
  const reopenTripMutation = useReopenTripMutation(tripId);
  const [confirmNote, setConfirmNote] = useState('');
  const canManage = canManageTrip(user?.id, membersQuery.data ?? []);
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
  const [
    memberCanCreateProposals,
    memberCanCreateExpenses,
    memberCanSeeDateResults,
    memberCanSeePlaceResults,
    memberCanModifyPlaceFields,
    settlementMarkPaidPolicy,
  ] = useWatch({
    control,
    name: [
      'memberCanCreateProposals',
      'memberCanCreateExpenses',
      'memberCanSeeDateResults',
      'memberCanSeePlaceResults',
      'memberCanModifyPlaceFields',
      'settlementMarkPaidPolicy',
    ],
  });

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

  if (tripQuery.isLoading || membersQuery.isLoading) {
    return <LoadingState label="Loading settings..." />;
  }

  const trip = tripQuery.data ?? null;
  const saveSettings = handleSubmit(async (values) => {
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
    <Screen scroll>
      <PageHeader
        eyebrow="Settings"
        title="Trip controls"
        description="Manage visibility, member permissions, confirmation, and read-only status."
      />

      {tripQuery.error ? <ErrorState title="Settings failed to load" message={tripQuery.error.message} /> : null}
      {updateMutation.isError ? <ErrorState title="Settings failed to save" message={updateMutation.error.message} /> : null}
      {confirmTripMutation.isError ? (
        <ErrorState title="Trip confirmation failed" message={confirmTripMutation.error.message} />
      ) : null}
      {closeTripMutation.isError ? <ErrorState title="Trip close failed" message={closeTripMutation.error.message} /> : null}
      {reopenTripMutation.isError ? (
        <ErrorState title="Trip reopen failed" message={reopenTripMutation.error.message} />
      ) : null}
      {!canManage ? (
        <StateBanner
          title="Permission denied"
          message="Only the owner or an admin can change trip settings."
          tone="locked"
        />
      ) : null}
      {updateMutation.isSuccess ? <StateBanner title="Settings saved" tone="success" /> : null}
      {confirmTripMutation.isSuccess ? <StateBanner title="Trip confirmed" tone="success" /> : null}
      {closeTripMutation.isSuccess ? (
        <StateBanner title="Trip closed" message="Members now see this trip as read-only." tone="success" />
      ) : null}
      {reopenTripMutation.isSuccess ? (
        <StateBanner title="Trip reopened" message="Members can edit allowed trip data again." tone="success" />
      ) : null}

      <Card variant="elevated">
        <View style={styles.statusHeader}>
          <View>
            <AppText variant="caption">Current state</AppText>
            <AppText variant="title">{visibleTripState(trip)}</AppText>
          </View>
          <ShieldCheck color={canManage ? colors.primary : colors.textSubtle} size={26} />
        </View>
        <AppText>
          {trip?.confirmedAt
            ? `Confirmed ${formatInstant(trip.confirmedAt)}`
            : 'Owner/admin confirmation is manual and separate from planning progress.'}
        </AppText>
        {trip?.closedAt ? <AppText>Closed {formatInstant(trip.closedAt)}</AppText> : null}
      </Card>

      <Card>
        <AppText variant="subtitle">Trip details</AppText>
        <Controller
          control={control}
          name="title"
          render={({ field }) => (
            <TextField
              label="Trip name"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.title?.message}
              editable={canManage}
            />
          )}
        />
        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <TextArea
              label="Description"
              value={field.value ?? ''}
              onChangeText={(text) => field.onChange(text.trim().length > 0 ? text : null)}
              onBlur={field.onBlur}
              error={errors.description?.message}
              editable={canManage}
            />
          )}
        />
        <Controller
          control={control}
          name="timezone"
          render={({ field }) => (
            <TextField
              label="Timezone"
              autoCapitalize="none"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.timezone?.message}
              editable={canManage}
            />
          )}
        />
      </Card>

      <Card>
        <AppText variant="subtitle">Visibility settings</AppText>
        <ToggleRow
          label="Members can see date results"
          description="If off, only owner/admin sees date poll rankings."
          value={memberCanSeeDateResults}
          disabled={!canManage}
          onValueChange={(value) => setValue('memberCanSeeDateResults', value, { shouldDirty: true })}
        />
        <ToggleRow
          label="Members can see place results"
          description="If off, only owner/admin sees destination rankings."
          value={memberCanSeePlaceResults}
          disabled={!canManage}
          onValueChange={(value) => setValue('memberCanSeePlaceResults', value, { shouldDirty: true })}
        />
      </Card>

      <Card>
        <AppText variant="subtitle">Member permissions</AppText>
        <ToggleRow
          label="Members can create place proposals"
          description="Admins can always create proposals."
          value={memberCanCreateProposals}
          disabled={!canManage}
          onValueChange={(value) => setValue('memberCanCreateProposals', value, { shouldDirty: true })}
        />
        <ToggleRow
          label="Members can add expenses"
          description="Admins can always add expenses."
          value={memberCanCreateExpenses}
          disabled={!canManage}
          onValueChange={(value) => setValue('memberCanCreateExpenses', value, { shouldDirty: true })}
        />
        <ToggleRow
          label="Members can modify place fields"
          description="Controls whether members can add custom comparison fields."
          value={memberCanModifyPlaceFields}
          disabled={!canManage}
          onValueChange={(value) => setValue('memberCanModifyPlaceFields', value, { shouldDirty: true })}
        />
      </Card>

      <Card>
        <AppText variant="subtitle">Settlement permissions</AppText>
        <ToggleRow
          label="Participants can mark settlements paid"
          description="If off, only owner/admin can mark payments as paid."
          value={settlementMarkPaidPolicy === 'participants'}
          disabled={!canManage}
          onValueChange={(value) =>
            setValue('settlementMarkPaidPolicy', value ? 'participants' : 'owner_admin_only', {
              shouldDirty: true,
            })
          }
        />
      </Card>

      <Button
        label="Save settings"
        loading={updateMutation.isPending}
        disabled={!canManage || !isDirty || updateMutation.isPending}
        onPress={saveSettings}
        leftIcon={<Save color={colors.primaryText} size={18} />}
      />

      <Card>
        <AppText variant="subtitle">Confirm trip</AppText>
        <AppText>
          Confirmation is a manual owner/admin action after the plan feels final enough to commit.
        </AppText>
        <TextArea
          label="Confirmation note"
          value={confirmNote}
          onChangeText={setConfirmNote}
          editable={canManage && !trip?.confirmedAt}
          placeholder="Optional note"
        />
        <Button
          label={trip?.confirmedAt ? 'Trip confirmed' : 'Confirm trip'}
          variant="secondary"
          loading={confirmTripMutation.isPending}
          disabled={!canManage || !user?.id || Boolean(trip?.confirmedAt) || confirmTripMutation.isPending}
          onPress={() => {
            if (!user?.id) {
              return;
            }

            confirmTripMutation.mutate({
              tripId,
              confirmedBy: user.id,
              confirmedNote: confirmNote.trim() || null,
            });
          }}
        />
      </Card>

      <Card variant={trip?.closedAt ? 'soft' : 'elevated'}>
        <AppText variant="subtitle">{trip?.closedAt ? 'Reopen trip' : 'Close trip'}</AppText>
        <AppText>
          Closing makes the trip read-only for members. Only owner/admin can reopen it.
        </AppText>
        {trip?.closedAt ? (
          <Button
            label="Reopen trip"
            variant="secondary"
            loading={reopenTripMutation.isPending}
            disabled={!canManage || reopenTripMutation.isPending}
            onPress={() =>
              confirmAction({
                title: 'Reopen trip?',
                message: 'Members will be able to edit allowed trip data again.',
                confirmLabel: 'Reopen',
                onConfirm: () => reopenTripMutation.mutate(),
              })
            }
            leftIcon={<RotateCcw color={colors.primary} size={18} />}
          />
        ) : (
          <Button
            label="Close trip"
            variant="danger"
            loading={closeTripMutation.isPending}
            disabled={!canManage || closeTripMutation.isPending}
            onPress={() =>
              confirmAction({
                title: 'Close trip?',
                message: 'The trip becomes read-only for members until an owner/admin reopens it.',
                confirmLabel: 'Close trip',
                destructive: true,
                onConfirm: () => closeTripMutation.mutate(),
              })
            }
            leftIcon={<Lock color={colors.danger} size={18} />}
          />
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
    justifyContent: 'space-between',
  },
});
