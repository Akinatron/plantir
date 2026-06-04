import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../../../src/components/feedback/InlineNotice';
import { LoadingState } from '../../../../src/components/feedback/LoadingState';
import { PlaceholderState } from '../../../../src/components/feedback/PlaceholderState';
import { AppText } from '../../../../src/components/ui/AppText';
import { Button } from '../../../../src/components/ui/Button';
import { Screen } from '../../../../src/components/ui/Screen';
import { useAuth } from '../../../../src/features/auth/AuthProvider';
import {
  useDatePollBundleQuery,
  useSaveDatePollVotesMutation,
  useUserDatePollVotesQuery,
} from '../../../../src/hooks/useDatePoll';
import { expandIsoDateRanges } from '../../../../src/lib/date/dateRange';
import { AvailabilityStatus } from '../../../../src/lib/algorithms/datePoll';
import { DatePollVoteByDate } from '../../../../src/types/datePoll';

const statusOptions: { label: string; value: AvailabilityStatus }[] = [
  { label: 'Prefer', value: 'preferred' },
  { label: 'Available', value: 'available' },
  { label: 'Maybe', value: 'maybe' },
  { label: 'Unavailable', value: 'unavailable' },
];

export default function DatePollVoteScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { user } = useAuth();
  const bundleQuery = useDatePollBundleQuery(tripId);
  const poll = bundleQuery.data?.poll;
  const votesQuery = useUserDatePollVotesQuery(poll?.id, user?.id);
  const saveMutation = useSaveDatePollVotesMutation(tripId);
  const days = useMemo(
    () => expandIsoDateRanges(bundleQuery.data?.allowedRanges ?? []),
    [bundleQuery.data?.allowedRanges],
  );

  if (bundleQuery.isLoading || votesQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading date poll..." />
      </Screen>
    );
  }

  if (!poll) {
    return (
      <Screen>
        <PlaceholderState title="No date poll" description="An owner or admin needs to start the date poll." />
      </Screen>
    );
  }

  return (
    <DatePollVoteContent
      days={days}
      initialVotes={votesQuery.data ?? {}}
      isClosed={poll.status === 'closed'}
      isLoggedIn={Boolean(user)}
      pollId={poll.id}
      saveMutation={saveMutation}
      userId={user?.id ?? null}
      votingDeadlineAt={poll.votingDeadlineAt}
    />
  );
}

function DatePollVoteContent({
  days,
  initialVotes,
  isClosed,
  isLoggedIn,
  pollId,
  saveMutation,
  userId,
  votingDeadlineAt,
}: {
  days: string[];
  initialVotes: DatePollVoteByDate;
  isClosed: boolean;
  isLoggedIn: boolean;
  pollId: string;
  saveMutation: ReturnType<typeof useSaveDatePollVotesMutation>;
  userId: string | null;
  votingDeadlineAt: string | null;
}) {
  const [votes, setVotes] = useState<DatePollVoteByDate>(initialVotes);

  const saveVotes = async () => {
    if (!userId) {
      return;
    }

    await saveMutation.mutateAsync({
      pollId,
      userId,
      votes,
    });
  };

  return (
    <Screen>
      <FlatList
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant="eyebrow">Date poll</AppText>
            <AppText variant="title">Mark your availability</AppText>
            <AppText>
              Unmarked days count as pending until you save. Use unavailable when a day definitely does not work.
            </AppText>

            {votingDeadlineAt ? <AppText>Deadline: {votingDeadlineAt}</AppText> : null}

            {isClosed ? (
              <InlineNotice title="Voting is closed" message="Results are read-only." tone="success" />
            ) : null}

            {saveMutation.error ? (
              <InlineNotice title="Votes failed to save" message={saveMutation.error.message} tone="error" />
            ) : null}

            {saveMutation.isSuccess ? <InlineNotice title="Votes saved" tone="success" /> : null}
          </View>
        }
        contentContainerStyle={styles.list}
        data={days}
        keyExtractor={(day) => day}
        ListEmptyComponent={<PlaceholderState title="No dates" description="The poll has no allowed date range." />}
        renderItem={({ item }) => (
          <VoteDayRow
            day={item}
            selectedStatus={votes[item]}
            disabled={isClosed}
            onSelect={(status) => {
              setVotes((current) => ({
                ...current,
                [item]: status,
              }));
            }}
          />
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <Button
              label={saveMutation.isPending ? 'Saving...' : 'Save availability'}
              onPress={saveVotes}
              disabled={!isLoggedIn || isClosed || saveMutation.isPending}
            />
          </View>
        }
      />
    </Screen>
  );
}

function VoteDayRow({
  day,
  selectedStatus,
  disabled,
  onSelect,
}: {
  day: string;
  selectedStatus: AvailabilityStatus | undefined;
  disabled: boolean;
  onSelect: (status: AvailabilityStatus) => void;
}) {
  return (
    <View style={styles.card}>
      <AppText variant="subtitle">{day}</AppText>
      <View style={styles.optionGrid}>
        {statusOptions.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={`${day}: ${option.label}`}
            accessibilityState={{ disabled, selected: selectedStatus === option.value }}
            disabled={disabled}
            onPress={() => onSelect(option.value)}
            style={[
              styles.option,
              selectedStatus === option.value && styles.optionSelected,
              disabled && styles.optionDisabled,
            ]}
          >
            <AppText>{option.label}</AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 10,
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
    gap: 12,
    padding: 16,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    alignItems: 'center',
    borderColor: '#D0D5DD',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionSelected: {
    backgroundColor: '#E7F4EF',
    borderColor: '#0F6B57',
  },
  optionDisabled: {
    opacity: 0.5,
  },
  footer: {
    paddingTop: 12,
  },
});
