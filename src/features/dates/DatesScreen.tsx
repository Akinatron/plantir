import { useMemo, useState } from 'react';
import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../components/feedback/InlineNotice';
import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/LoadingState';
import { Screen } from '../../components/ui/Screen';
import { spacing } from '../../design/spacing';
import { useAuth } from '../auth/AuthProvider';
import {
  useCloseDatePollMutation,
  useComputeDatePollResultsMutation,
  useDatePollBundleQuery,
  useDatePollResultsQuery,
  useDatePollVotesQuery,
  useSaveDatePollVotesMutation,
  useUserDatePollVotesQuery,
} from '../../hooks/useDatePoll';
import { useTripMembersQuery, useTripQuery } from '../../hooks/useTrips';
import { expandIsoDateRanges } from '../../lib/date/dateRange';
import { confirmAction } from '../../lib/ui/confirmAction';
import { DatePollVoteByDate } from '../../types/datePoll';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { AvailabilitySummary } from './AvailabilitySummary';
import { DateRangeDetail } from './DateRangeDetail';
import { DateRankingList } from './DateRankingList';

type DatesScreenProps = {
  tripId: string;
};

export function DatesScreen({ tripId }: DatesScreenProps) {
  const { user } = useAuth();
  const tripQuery = useTripQuery(tripId);
  const membersQuery = useTripMembersQuery(tripId);
  const bundleQuery = useDatePollBundleQuery(tripId);
  const poll = bundleQuery.data?.poll;
  const days = useMemo(
    () => expandIsoDateRanges(bundleQuery.data?.allowedRanges ?? []),
    [bundleQuery.data?.allowedRanges],
  );
  const userVotesQuery = useUserDatePollVotesQuery(poll?.id, user?.id);
  const saveMutation = useSaveDatePollVotesMutation(tripId);
  const computeMutation = useComputeDatePollResultsMutation(poll?.id);
  const closeMutation = useCloseDatePollMutation(tripId);
  const initialAvailableDates = useMemo(() => getAvailableDates(userVotesQuery.data ?? {}), [userVotesQuery.data]);
  const [draftDates, setDraftDates] = useState<Set<string> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const selectedDates = draftDates ?? initialAvailableDates;
  const hasVoted = initialAvailableDates.size > 0;
  const isAdmin = Boolean(
    user?.id &&
      membersQuery.data?.some(
        (member) => member.userId === user.id && (member.role === 'owner' || member.role === 'admin'),
      ),
  );
  const canSeeRanking = Boolean(tripQuery.data && (tripQuery.data.memberCanSeeDateResults || isAdmin));
  const rankingPollId = hasVoted && canSeeRanking ? poll?.id : null;
  const resultsQuery = useDatePollResultsQuery(rankingPollId);
  const allVotesQuery = useDatePollVotesQuery(rankingPollId);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const winner = resultsQuery.data?.find((result) => result.isWinner) ?? resultsQuery.data?.[0] ?? null;
  const selectedResult =
    resultsQuery.data?.find((result) => result.id === selectedResultId) ?? resultsQuery.data?.[0] ?? null;

  if (tripQuery.isLoading || bundleQuery.isLoading || userVotesQuery.isLoading || membersQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading dates..." />
      </Screen>
    );
  }

  if (!poll) {
    return (
      <Screen scroll>
        <Card variant="soft" padding="lg">
          <EmptyState
            title="No date poll yet"
            description="An owner or admin needs to create a date poll before members can add availability."
          />
          <Link href={`/trips/${tripId}/date-poll/setup`} asChild>
            <Button label="Set up date poll" />
          </Link>
        </Card>
      </Screen>
    );
  }

  const isClosed = poll.status === 'closed';
  const saveAvailability = async () => {
    if (!user?.id) {
      return;
    }

    const votes = Array.from(selectedDates).reduce<DatePollVoteByDate>((nextVotes, date) => {
      nextVotes[date] = 'available';
      return nextVotes;
    }, {});

    await saveMutation.mutateAsync({
      pollId: poll.id,
      userId: user.id,
      votes,
    });
    setDraftDates(null);
    setIsEditing(false);
  };

  return (
    <Screen scroll contentContainerStyle={styles.screenContent}>
      <View style={styles.header}>
        <AppText variant="eyebrow">Dates</AppText>
        <AppText variant="display">Choose when you can go</AppText>
        <AppText variant="body">
          Mark only the days you are available. Anything unmarked is treated as not available.
        </AppText>
      </View>

      {isClosed ? <InlineNotice title="Date poll closed" message="Availability is read-only." tone="success" /> : null}
      {saveMutation.error ? (
        <InlineNotice title="Availability failed to save" message={saveMutation.error.message} tone="error" />
      ) : null}
      {saveMutation.isSuccess ? <InlineNotice title="Availability saved" tone="success" /> : null}
      {computeMutation.error ? (
        <InlineNotice title="Ranking failed to compute" message={computeMutation.error.message} tone="error" />
      ) : null}
      {closeMutation.error ? (
        <InlineNotice title="Date poll failed to close" message={closeMutation.error.message} tone="error" />
      ) : null}
      {closeMutation.isSuccess ? (
        <InlineNotice
          title="Date poll closed"
          message={`${formatDate(closeMutation.data.winner.startDate)} - ${formatDate(closeMutation.data.winner.endDate)}`}
          tone="success"
        />
      ) : null}

      <AvailabilitySummary
        availableCount={initialAvailableDates.size}
        totalDays={days.length}
        deadlineAt={poll.votingDeadlineAt}
        hasVoted={hasVoted}
        disabled={isClosed || !user}
        onEdit={() => {
          setDraftDates(new Set(initialAvailableDates));
          setIsEditing(true);
        }}
      />

      {isEditing || !hasVoted ? (
        <AvailabilityCalendar
          days={days}
          selectedDates={selectedDates}
          disabled={isClosed || !user}
          isSaving={saveMutation.isPending}
          onToggleDate={(date) => {
            setDraftDates((current) => {
              const source = current ?? initialAvailableDates;
              const next = new Set(source);
              if (next.has(date)) {
                next.delete(date);
              } else {
                next.add(date);
              }
              return next;
            });
          }}
          onCancel={
            hasVoted
              ? () => {
                  setDraftDates(null);
                  setIsEditing(false);
                }
              : undefined
          }
          onSave={saveAvailability}
        />
      ) : null}

      {hasVoted ? (
        canSeeRanking ? (
          <View style={styles.rankingGrid}>
            <DateRankingList
              results={resultsQuery.data ?? []}
              isComputing={computeMutation.isPending}
              canCompute={!isClosed}
              selectedResultId={selectedResult?.id}
              onCompute={() => computeMutation.mutate()}
              onSelectResult={(result) => setSelectedResultId(result.id)}
            />
            <DateRangeDetail
              result={selectedResult}
              members={membersQuery.data ?? []}
              votes={allVotesQuery.data ?? []}
              votesError={allVotesQuery.error}
            />
            {isAdmin ? (
              <Card variant="soft" padding="lg" style={styles.adminCard}>
                <AppText variant="subtitle">Admin decision</AppText>
                <AppText variant="body">
                  Closing the poll saves the top ranked range automatically. You do not manually choose a date.
                </AppText>
                <Button
                  label={closeMutation.isPending ? 'Closing...' : 'Close poll and save winner'}
                  variant="secondary"
                  disabled={isClosed || closeMutation.isPending || !winner}
                  loading={closeMutation.isPending}
                  onPress={() => {
                    if (!poll?.id || !winner) {
                      return;
                    }

                    confirmAction({
                      title: 'Close date poll?',
                      message: `The app will save ${formatDate(winner.startDate)} - ${formatDate(winner.endDate)} as the winning range.`,
                      confirmLabel: 'Close poll',
                      onConfirm: () => closeMutation.mutate(poll.id),
                    });
                  }}
                />
              </Card>
            ) : null}
          </View>
        ) : (
          <Card variant="soft" padding="lg">
            <EmptyState
              title="Ranking hidden"
              description="The owner or admin has disabled date results for members."
            />
          </Card>
        )
      ) : null}
    </Screen>
  );
}

function getAvailableDates(votes: DatePollVoteByDate) {
  return new Set(
    Object.entries(votes)
      .filter(([, status]) => status === 'available' || status === 'preferred')
      .map(([date]) => date),
  );
}

const styles = StyleSheet.create({
  screenContent: {
    gap: spacing[5],
    paddingBottom: spacing[10],
    paddingTop: spacing[5],
  },
  header: {
    gap: spacing[2],
  },
  rankingGrid: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
  },
  adminCard: {
    flexBasis: '100%',
  },
});

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}
