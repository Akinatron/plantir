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
  useCloseDestinationPollMutation,
  useComputeDestinationResultsMutation,
  useDestinationBundleQuery,
  useDestinationResultsQuery,
} from '../../../../src/hooks/useDestination';
import { confirmAction } from '../../../../src/lib/ui/confirmAction';
import { DestinationPollResult, DestinationProposal } from '../../../../src/types/destination';

export default function DestinationResultsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const bundleQuery = useDestinationBundleQuery(tripId);
  const poll = bundleQuery.data?.poll;
  const resultsQuery = useDestinationResultsQuery(poll?.id);
  const computeMutation = useComputeDestinationResultsMutation(poll?.id);
  const closeMutation = useCloseDestinationPollMutation(tripId);
  const proposals = bundleQuery.data?.proposals ?? [];
  const results = resultsQuery.data ?? [];
  const tiedWinners = results.filter((result) => result.isTiedWinner);
  const winner = results.find((result) => result.isWinner);

  if (bundleQuery.isLoading || resultsQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading destination results..." />
      </Screen>
    );
  }

  if (!poll) {
    return (
      <Screen>
        <PlaceholderState title="No destination poll" description="Start destination voting before viewing results." />
      </Screen>
    );
  }

  const closePoll = (selectedProposalId: string | null) => {
    const proposalTitle = selectedProposalId ? getProposalTitle(proposals, selectedProposalId) : 'the top ranked proposal';
    confirmAction({
      title: 'Close destination vote?',
      message: `This saves ${proposalTitle} as the selected accommodation.`,
      confirmLabel: 'Close vote',
      onConfirm: () =>
        closeMutation.mutate({
          pollId: poll.id,
          selectedProposalId,
        }),
    });
  };

  return (
    <Screen>
      <FlatList
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant="eyebrow">Destination results</AppText>
            <AppText variant="title">Voting ranking</AppText>
            <AppText>Each member gets one vote. Vote count decides the winner; ties require owner/admin selection.</AppText>

            {poll.status === 'closed' && winner ? (
              <InlineNotice
                title="Destination decided"
                message={getProposalTitle(proposals, winner.proposalId)}
                tone="success"
              />
            ) : null}

            {computeMutation.error ? (
              <InlineNotice title="Results failed to compute" message={computeMutation.error.message} tone="error" />
            ) : null}

            {closeMutation.error ? (
              <InlineNotice title="Poll failed to close" message={closeMutation.error.message} tone="error" />
            ) : null}

            {closeMutation.isSuccess ? (
              <InlineNotice title="Poll closed" message="Selected accommodation saved." tone="success" />
            ) : null}

            <View style={styles.actions}>
              <Button
                label={computeMutation.isPending ? 'Computing...' : 'Compute results'}
                onPress={() => computeMutation.mutate()}
                disabled={computeMutation.isPending || poll.status === 'closed'}
              />
              {tiedWinners.length === 0 ? (
                <Button
                  label={closeMutation.isPending ? 'Closing...' : 'Close poll and save winner'}
                  variant="secondary"
                  onPress={() => closePoll(null)}
                  disabled={closeMutation.isPending || poll.status === 'closed' || results.length === 0}
                />
              ) : null}
            </View>

            {tiedWinners.length > 0 && poll.status !== 'closed' ? (
              <View style={styles.tieBox}>
                <AppText variant="subtitle">Tie resolution</AppText>
                {tiedWinners.map((result) => (
                  <Button
                    key={result.proposalId}
                    label={`Select ${getProposalTitle(proposals, result.proposalId)}`}
                    variant="secondary"
                    onPress={() => closePoll(result.proposalId)}
                    disabled={closeMutation.isPending}
                  />
                ))}
              </View>
            ) : null}
          </View>
        }
        contentContainerStyle={styles.list}
        data={results}
        keyExtractor={(result) => result.id}
        ListEmptyComponent={
          <PlaceholderState title="No results yet" description="Compute results after members vote." />
        }
        renderItem={({ item }) => <ResultRow result={item} proposalTitle={getProposalTitle(proposals, item.proposalId)} />}
      />
    </Screen>
  );
}

function ResultRow({
  result,
  proposalTitle,
}: {
  result: DestinationPollResult;
  proposalTitle: string;
}) {
  return (
    <Card selected={result.isWinner || result.isTiedWinner}>
      <AppText variant="subtitle">
        #{result.rank} {proposalTitle}
      </AppText>
      <AppText>
        Votes: {result.voteCount} / {result.totalMemberCount}
      </AppText>
      {result.isWinner ? <AppText>Winner</AppText> : null}
      {result.isTiedWinner ? <AppText>Tied winner</AppText> : null}
    </Card>
  );
}

function getProposalTitle(proposals: DestinationProposal[], proposalId: string): string {
  return proposals.find((proposal) => proposal.id === proposalId)?.title ?? 'Unknown proposal';
}

const styles = StyleSheet.create({
  header: {
    gap: 12,
    paddingTop: 24,
  },
  actions: {
    gap: 10,
  },
  tieBox: {
    gap: 10,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
});
