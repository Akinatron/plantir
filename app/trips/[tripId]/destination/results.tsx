import { useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../../../src/components/feedback/InlineNotice';
import { LoadingState } from '../../../../src/components/feedback/LoadingState';
import { PlaceholderState } from '../../../../src/components/feedback/PlaceholderState';
import { AppText } from '../../../../src/components/ui/AppText';
import { Button } from '../../../../src/components/ui/Button';
import { Card } from '../../../../src/components/ui/Card';
import { ErrorState } from '../../../../src/components/ui/ErrorState';
import { Screen } from '../../../../src/components/ui/Screen';
import { StateBanner } from '../../../../src/components/ui/StateBanner';
import { useAuth } from '../../../../src/features/auth/AuthProvider';
import { canManageTrip } from '../../../../src/features/trip-admin/adminUtils';
import {
  useCloseDestinationPollMutation,
  useComputeDestinationResultsMutation,
  useDestinationBundleQuery,
  useDestinationResultsQuery,
} from '../../../../src/hooks/useDestination';
import { useTripMembersQuery, useTripQuery } from '../../../../src/hooks/useTrips';
import { confirmAction } from '../../../../src/lib/ui/confirmAction';
import { DestinationPollResult, DestinationProposal } from '../../../../src/types/destination';

export default function DestinationResultsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { user } = useAuth();
  const tripQuery = useTripQuery(tripId);
  const membersQuery = useTripMembersQuery(tripId);
  const bundleQuery = useDestinationBundleQuery(tripId);
  const poll = bundleQuery.data?.poll;
  const canManage = canManageTrip(user?.id, membersQuery.data ?? []);
  const canSeeResults = Boolean(tripQuery.data?.memberCanSeePlaceResults || canManage);
  const isReadOnly = Boolean(tripQuery.data?.closedAt || poll?.status === 'closed');
  const resultsQuery = useDestinationResultsQuery(canSeeResults ? poll?.id : null);
  const computeMutation = useComputeDestinationResultsMutation(poll?.id);
  const closeMutation = useCloseDestinationPollMutation(tripId);
  const proposals = bundleQuery.data?.proposals ?? [];
  const results = resultsQuery.data ?? [];
  const tiedWinners = results.filter((result) => result.isTiedWinner);
  const winner = results.find((result) => result.isWinner);

  if (tripQuery.isLoading || membersQuery.isLoading || bundleQuery.isLoading || resultsQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading destination results..." />
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

  if (bundleQuery.isError) {
    return (
      <Screen centered>
        <ErrorState title="Destination failed to load" message={bundleQuery.error.message} />
      </Screen>
    );
  }

  if (resultsQuery.isError && canSeeResults) {
    return (
      <Screen centered>
        <ErrorState title="Results failed to load" message={resultsQuery.error.message} />
      </Screen>
    );
  }

  if (!poll) {
    return (
      <Screen>
        {canManage ? (
          <PlaceholderState title="No destination poll" description="Start destination voting before viewing results." />
        ) : (
          <StateBanner
            title="Waiting for accommodation voting"
            message="The owner or an admin needs to start this poll first."
            tone="locked"
          />
        )}
      </Screen>
    );
  }

  if (!canSeeResults) {
    return (
      <Screen centered>
        <StateBanner
          title="Results hidden"
          message="The owner or an admin has not made accommodation results visible to members."
          tone="hidden"
        />
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

            {!canManage ? (
              <StateBanner
                title="View only"
                message="Only the owner or an admin can compute results, close the poll, or resolve ties."
                tone="locked"
              />
            ) : null}

            {tripQuery.data?.closedAt ? (
              <StateBanner
                title="Trip is read-only"
                message="Destination results cannot be changed while this trip is closed."
                tone="locked"
              />
            ) : null}

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
                disabled={!canManage || computeMutation.isPending || isReadOnly}
              />
              {tiedWinners.length === 0 ? (
                <Button
                  label={closeMutation.isPending ? 'Closing...' : 'Close poll and save winner'}
                  variant="secondary"
                  onPress={() => closePoll(null)}
                  disabled={!canManage || closeMutation.isPending || isReadOnly || results.length === 0}
                />
              ) : null}
            </View>

            {canManage && tiedWinners.length > 0 && !isReadOnly ? (
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
