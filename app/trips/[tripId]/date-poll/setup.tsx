import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../../../src/components/feedback/InlineNotice';
import { LoadingState } from '../../../../src/components/feedback/LoadingState';
import { AppText } from '../../../../src/components/ui/AppText';
import { Button } from '../../../../src/components/ui/Button';
import { CalendarDateField, CalendarDateTimeField } from '../../../../src/components/ui/CalendarDateField';
import { Screen } from '../../../../src/components/ui/Screen';
import { TextField } from '../../../../src/components/ui/TextField';
import { useAuth } from '../../../../src/features/auth/AuthProvider';
import { useCreateDatePollMutation, useDatePollBundleQuery } from '../../../../src/hooks/useDatePoll';
import { useTripMembersQuery } from '../../../../src/hooks/useTrips';
import { DatePollSetupFormValues, datePollSetupSchema } from '../../../../src/lib/validation/datePoll';
import { TripMember } from '../../../../src/types/trip';

export default function DatePollSetupScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { user } = useAuth();
  const membersQuery = useTripMembersQuery(tripId);
  const datePollQuery = useDatePollBundleQuery(tripId);
  const createMutation = useCreateDatePollMutation(user?.id);
  const [requiredMemberIds, setRequiredMemberIds] = useState<string[]>([]);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DatePollSetupFormValues>({
    resolver: zodResolver(datePollSetupSchema),
    defaultValues: {
      tripId,
      allowedStartDate: '',
      allowedEndDate: '',
      minTripDays: 2,
      maxTripDays: 4,
      preferredDurationDays: null,
      votingDeadlineAt: null,
      requiredMemberIds: [],
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const poll = await createMutation.mutateAsync({
      ...values,
      tripId,
      requiredMemberIds,
    });
    router.replace(`/trips/${tripId}/date-poll/vote?pollId=${poll.id}`);
  });

  if (membersQuery.isLoading || datePollQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading date poll setup..." />
      </Screen>
    );
  }

  const existingPoll = datePollQuery.data?.poll;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <AppText variant="eyebrow">Date poll</AppText>
          <AppText variant="title">Set the voting window</AppText>
          <AppText>Members will mark each allowed travel day as prefer, available, maybe, or unavailable.</AppText>
        </View>

        {existingPoll && existingPoll.status !== 'closed' ? (
          <InlineNotice
            title="Date poll already active"
            message="Use the vote or results screen for the current poll."
            tone="success"
          />
        ) : null}

        {createMutation.error ? (
          <InlineNotice title="Date poll setup failed" message={createMutation.error.message} tone="error" />
        ) : null}

        <View style={styles.form}>
          <Controller
            control={control}
            name="allowedStartDate"
            render={({ field: { onChange, value } }) => (
              <CalendarDateField
                label="Allowed start date"
                value={value}
                onChange={(nextDate) => onChange(nextDate ?? '')}
                allowClear={false}
                error={errors.allowedStartDate?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="allowedEndDate"
            render={({ field: { onChange, value } }) => (
              <CalendarDateField
                label="Allowed end date"
                value={value}
                onChange={(nextDate) => onChange(nextDate ?? '')}
                allowClear={false}
                error={errors.allowedEndDate?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="minTripDays"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                label="Min trip days"
                keyboardType="number-pad"
                onBlur={onBlur}
                onChangeText={(text) => onChange(Number(text))}
                value={String(value)}
                error={errors.minTripDays?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="maxTripDays"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                label="Max trip days"
                keyboardType="number-pad"
                onBlur={onBlur}
                onChangeText={(text) => onChange(Number(text))}
                value={String(value)}
                error={errors.maxTripDays?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="preferredDurationDays"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                label="Preferred duration"
                placeholder="Optional"
                keyboardType="number-pad"
                onBlur={onBlur}
                onChangeText={(text) => onChange(text.trim().length > 0 ? Number(text) : null)}
                value={value === null ? '' : String(value)}
                error={errors.preferredDurationDays?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="votingDeadlineAt"
            render={({ field: { onChange, value } }) => (
              <CalendarDateTimeField
                label="Voting deadline"
                value={value ?? ''}
                onChange={onChange}
                error={errors.votingDeadlineAt?.message}
              />
            )}
          />
        </View>

        <View style={styles.section}>
          <AppText variant="subtitle">Required members</AppText>
          <AppText>Optional. Required members are shown in the result ranking when they are missing.</AppText>
          {(membersQuery.data ?? []).map((member) => (
            <RequiredMemberRow
              key={member.id}
              member={member}
              selected={requiredMemberIds.includes(member.userId)}
              onToggle={() => {
                setRequiredMemberIds((current) =>
                  current.includes(member.userId)
                    ? current.filter((memberId) => memberId !== member.userId)
                    : [...current, member.userId],
                );
              }}
            />
          ))}
        </View>

        <Button
          label={createMutation.isPending ? 'Starting...' : 'Start date poll'}
          onPress={onSubmit}
          disabled={!user || createMutation.isPending || Boolean(existingPoll && existingPoll.status !== 'closed')}
        />
      </ScrollView>
    </Screen>
  );
}

function RequiredMemberRow({
  member,
  selected,
  onToggle,
}: {
  member: TripMember;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable style={[styles.memberRow, selected && styles.memberRowSelected]} onPress={onToggle}>
      <View>
        <AppText variant="subtitle">{member.displayName ?? 'Unnamed member'}</AppText>
        <AppText>{member.role}</AppText>
      </View>
      <AppText>{selected ? 'Required' : 'Optional'}</AppText>
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
    gap: 12,
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
