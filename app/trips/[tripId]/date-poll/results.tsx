import { useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../../../src/components/feedback/InlineNotice';
import { LoadingState } from '../../../../src/components/feedback/LoadingState';
import { PlaceholderState } from '../../../../src/components/feedback/PlaceholderState';
import { AppText } from '../../../../src/components/ui/AppText';
import { Button } from '../../../../src/components/ui/Button';
import { Screen } from '../../../../src/components/ui/Screen';
import {
  useCloseDatePollMutation,
  useComputeDatePollResultsMutation,
  useDatePollBundleQuery,
  useDatePollResultsQuery,
} from '../../../../src/hooks/useDatePoll';
import { DatePollResult } from '../../../../src/types/datePoll';

export default function DatePollResultsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const bundleQuery = useDatePollBundleQuery(tripId);
  const poll = bundleQuery.data?.poll;
  const resultsQuery = useDatePollResultsQuery(poll?.id);
  const computeMutation = useComputeDatePollResultsMutation(poll?.id);
  const closeMutation = useCloseDatePollMutation(tripId);
  const winner = resultsQuery.data?.find((result) => result.isWinner) ?? resultsQuery.data?.[0];

  if (bundleQuery.isLoading || resultsQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading date poll results..." />
      </Screen>
    );
  }

  if (!poll) {
    return (
      <Screen>
        <PlaceholderState title="No date poll" description="Start a date poll before viewing results." />
      </Screen>
    );
  }

  const closePoll = async () => {
    await closeMutation.mutateAsync(poll.id);
  };

  return (
    <Screen>
      <FlatList
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant="eyebrow">Date results</AppText>
            <AppText variant="title">Best date ranges</AppText>
            <AppText>
              Results are ranked by the approved deterministic rules. Closing the poll saves the top result.
            </AppText>

            {poll.status === 'closed' && winner ? (
              <InlineNotice
                title="Date decided"
                message={`${winner.startDate} to ${winner.endDate}`}
                tone="success"
              />
            ) : null}

            {computeMutation.error ? (
              <InlineNotice
                title="Results failed to compute"
                message={computeMutation.error.message}
                tone="error"
              />
            ) : null}

            {closeMutation.error ? (
              <InlineNotice title="Poll failed to close" message={closeMutation.error.message} tone="error" />
            ) : null}

            {closeMutation.isSuccess ? (
              <InlineNotice
                title="Poll closed"
                message={`${closeMutation.data.winner.startDate} to ${closeMutation.data.winner.endDate}`}
                tone="success"
              />
            ) : null}

            <View style={styles.actions}>
              <Button
                label={computeMutation.isPending ? 'Computing...' : 'Compute results'}
                onPress={() => computeMutation.mutate()}
                disabled={computeMutation.isPending || poll.status === 'closed'}
              />
              <Button
                label={closeMutation.isPending ? 'Closing...' : 'Close poll and save winner'}
                variant="secondary"
                onPress={closePoll}
                disabled={closeMutation.isPending || poll.status === 'closed'}
              />
            </View>
          </View>
        }
        contentContainerStyle={styles.list}
        data={resultsQuery.data ?? []}
        keyExtractor={(result) => result.id}
        ListEmptyComponent={
          <PlaceholderState
            title="No results yet"
            description="Compute results after members have saved availability."
          />
        }
        renderItem={({ item }) => <ResultRow result={item} />}
      />
    </Screen>
  );
}

function ResultRow({ result }: { result: DatePollResult }) {
  return (
    <View style={[styles.card, result.isWinner && styles.winnerCard]}>
      <View style={styles.rowHeader}>
        <AppText variant="subtitle">
          #{result.rank} {result.startDate} to {result.endDate}
        </AppText>
        {result.isWinner ? <AppText>Winner</AppText> : null}
      </View>
      <AppText>Duration: {result.durationDays} days</AppText>
      <AppText>
        Available: {result.availableMemberCount} / {result.totalMemberCount} (
        {Math.round(result.availablePercentage * 100)}%)
      </AppText>
      <AppText>
        Prefer: {result.preferredMemberCount} · Maybe: {result.maybeMemberCount} · Unavailable:{' '}
        {result.unavailableMemberCount} · Pending: {result.pendingMemberCount}
      </AppText>
      {result.requiredMembersMissingCount > 0 ? (
        <AppText>Required missing: {result.requiredMembersMissingCount}</AppText>
      ) : null}
      <AppText>Score: {result.score}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 12,
    paddingTop: 24,
  },
  actions: {
    gap: 10,
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
  winnerCard: {
    borderColor: '#0F6B57',
  },
  rowHeader: {
    gap: 6,
  },
});
