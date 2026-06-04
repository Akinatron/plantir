import { useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../../../src/components/feedback/InlineNotice';
import { LoadingState } from '../../../../src/components/feedback/LoadingState';
import { PlaceholderState } from '../../../../src/components/feedback/PlaceholderState';
import { AppText } from '../../../../src/components/ui/AppText';
import { Button } from '../../../../src/components/ui/Button';
import { Card } from '../../../../src/components/ui/Card';
import { Screen } from '../../../../src/components/ui/Screen';
import {
  useCloseDatePollMutation,
  useComputeDatePollResultsMutation,
  useDatePollBundleQuery,
  useDatePollResultsQuery,
} from '../../../../src/hooks/useDatePoll';
import { confirmAction } from '../../../../src/lib/ui/confirmAction';
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

  const closePoll = () => {
    confirmAction({
      title: 'Close date poll?',
      message: 'The app will save the top ranked date range and move the trip to date decided.',
      confirmLabel: 'Close poll',
      onConfirm: () => closeMutation.mutate(poll.id),
    });
  };

  return (
    <Screen>
      <FlatList
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant="eyebrow">Date results</AppText>
            <AppText variant="title">Best date ranges</AppText>
            <AppText>Results are ranked automatically. Closing the poll saves the top result for the trip.</AppText>

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
                disabled={closeMutation.isPending || poll.status === 'closed' || !winner}
              />
            </View>
          </View>
        }
        contentContainerStyle={styles.list}
        data={resultsQuery.data ?? []}
        keyExtractor={(result) => result.id}
        ListEmptyComponent={
          <PlaceholderState
            title="No date votes yet"
            description="Ask members to save availability, then compute results."
          />
        }
        renderItem={({ item }) => <ResultRow result={item} />}
      />
    </Screen>
  );
}

function ResultRow({ result }: { result: DatePollResult }) {
  return (
    <Card selected={result.isWinner}>
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
        Prefer: {result.preferredMemberCount} / Maybe: {result.maybeMemberCount} / Unavailable:{' '}
        {result.unavailableMemberCount} / Pending: {result.pendingMemberCount}
      </AppText>
      {result.requiredMembersMissingCount > 0 ? (
        <AppText>Required missing: {result.requiredMembersMissingCount}</AppText>
      ) : null}
      <AppText>Score: {result.score}</AppText>
    </Card>
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
  rowHeader: {
    gap: 6,
  },
});
