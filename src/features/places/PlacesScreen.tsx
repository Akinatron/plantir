import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import { Plus, RefreshCcw } from 'lucide-react-native';

import { useAuth } from '../auth/AuthProvider';
import {
  useDestinationBundleQuery,
  useDestinationCustomFieldsQuery,
  useDestinationResultsQuery,
  useUserDestinationVoteQuery,
  useVoteForDestinationProposalMutation,
} from '../../hooks/useDestination';
import { useTripMembersQuery, useTripQuery } from '../../hooks/useTrips';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Screen } from '../../components/ui/Screen';
import { StateBanner } from '../../components/ui/StateBanner';
import { Card } from '../../components/ui/Card';
import { AppText } from '../../components/ui/AppText';
import { colors } from '../../design/theme';
import { spacing } from '../../design/spacing';
import { DestinationPollResult, DestinationProposal } from '../../types/destination';
import { canManageTrip } from '../trip-admin/adminUtils';
import { PlaceCard } from './PlaceCard';

type PlacesScreenProps = {
  tripId: string;
};

export function PlacesScreen({ tripId }: PlacesScreenProps) {
  const { user } = useAuth();
  const tripQuery = useTripQuery(tripId);
  const membersQuery = useTripMembersQuery(tripId);
  const bundleQuery = useDestinationBundleQuery(tripId);
  const poll = bundleQuery.data?.poll ?? null;
  const proposals = useMemo(() => bundleQuery.data?.proposals ?? [], [bundleQuery.data?.proposals]);
  const canManage = canManageTrip(user?.id, membersQuery.data ?? []);
  const canSeeResults = Boolean(tripQuery.data && (tripQuery.data.memberCanSeePlaceResults || canManage));
  const canCreateProposal = Boolean(tripQuery.data && (tripQuery.data.memberCanCreateProposals || canManage));
  const userVoteQuery = useUserDestinationVoteQuery(poll?.id, user?.id);
  const resultsQuery = useDestinationResultsQuery(canSeeResults ? poll?.id : null);
  const fieldsQuery = useDestinationCustomFieldsQuery(tripId, poll?.id);
  const voteMutation = useVoteForDestinationProposalMutation(tripId);
  const resultByProposalId = useMemo(
    () => new Map((resultsQuery.data ?? []).map((result) => [result.proposalId, result])),
    [resultsQuery.data],
  );
  const sortedProposals = useMemo(
    () => sortProposals(proposals, resultByProposalId),
    [proposals, resultByProposalId],
  );
  const isClosed = Boolean(tripQuery.data?.closedAt || poll?.status === 'closed');

  const vote = (proposal: DestinationProposal) => {
    if (!poll || !user || isClosed) {
      return;
    }

    voteMutation.mutate({
      tripId,
      pollId: poll.id,
      proposalId: proposal.id,
      userId: user.id,
    });
  };

  if (bundleQuery.isLoading || tripQuery.isLoading || membersQuery.isLoading) {
    return <LoadingState label="Loading places..." />;
  }

  if (bundleQuery.isError) {
    return <ErrorState title="Places failed to load" message={bundleQuery.error.message} />;
  }

  if (tripQuery.isError) {
    return <ErrorState title="Trip failed to load" message={tripQuery.error.message} />;
  }

  if (membersQuery.isError) {
    return <ErrorState title="Members failed to load" message={membersQuery.error.message} />;
  }

  return (
    <Screen scroll>
      <PageHeader
        eyebrow="Places"
        title="Choose where to stay"
        description="Compare the group's proposals, open the original listing, and vote for one place."
      >
        <View style={styles.headerActions}>
          {canManage && !isClosed ? (
            <Link href={`/trips/${tripId}/destination/setup`} asChild>
              <Button label={poll ? 'Reset poll' : 'Start place vote'} variant="outline" fullWidth={false} />
            </Link>
          ) : null}
          {poll && canCreateProposal && !isClosed ? (
            <Link href={`/trips/${tripId}/destination/create?pollId=${poll.id}`} asChild>
              <Button
                label="Suggest place"
                fullWidth={false}
                leftIcon={<Plus color={colors.primaryText} size={18} />}
              />
            </Link>
          ) : null}
        </View>
      </PageHeader>

      {isClosed ? (
        <StateBanner
          title="Trip is read-only"
          message="Votes and proposals cannot be changed while this trip is closed."
          tone="locked"
        />
      ) : null}

      {!poll ? (
        canManage ? (
          <EmptyState
            title="No place vote yet"
            description="Start the place vote when the group is ready to compare accommodation options."
          />
        ) : (
          <StateBanner
            title="Waiting for an admin"
            message="Only the owner or an admin can start the place vote."
            tone="locked"
          />
        )
      ) : null}

      {poll ? (
        <>
          <Card variant="soft">
            <View style={styles.summary}>
              <View>
                <AppText variant="bodyStrong">{proposals.length} proposals</AppText>
                <AppText variant="caption">
                  {tripQuery.data?.memberCanSeePlaceResults
                    ? 'Votes are visible for this trip.'
                    : canManage
                      ? 'Members cannot see results, but admins can.'
                      : 'Results are hidden by trip settings.'}
                </AppText>
              </View>
              {canSeeResults ? (
                <Link href={`/trips/${tripId}/destination/results`} asChild>
                  <Button
                    label="Results"
                    variant="secondary"
                    fullWidth={false}
                    leftIcon={<RefreshCcw color={colors.primary} size={16} />}
                  />
                </Link>
              ) : null}
            </View>
          </Card>

          {!canSeeResults ? (
            <StateBanner
              title="Results hidden"
              message="The owner or admin has disabled place results for members."
              tone="hidden"
            />
          ) : null}

          {sortedProposals.length === 0 ? (
            <EmptyState
              title="No places yet"
              description={
                canCreateProposal
                  ? 'Add the first place so the group has something concrete to compare.'
                  : 'No accommodation proposals have been added yet.'
              }
            />
          ) : (
            <View style={styles.grid}>
              {sortedProposals.map((proposal) => (
                <View key={proposal.id} style={styles.gridItem}>
                  <PlaceCard
                    tripId={tripId}
                    proposal={proposal}
                    result={resultByProposalId.get(proposal.id)}
                    customFields={fieldsQuery.data ?? []}
                    selected={userVoteQuery.data?.proposalId === proposal.id}
                    showVotes={canSeeResults}
                    votingDisabled={Boolean(isClosed || voteMutation.isPending)}
                    voting={voteMutation.isPending && voteMutation.variables?.proposalId === proposal.id}
                    onVote={() => vote(proposal)}
                  />
                </View>
              ))}
            </View>
          )}
        </>
      ) : null}
    </Screen>
  );
}

function sortProposals(
  proposals: DestinationProposal[],
  resultByProposalId: Map<string, DestinationPollResult>,
): DestinationProposal[] {
  return [...proposals].sort((left, right) => {
    const leftResult = resultByProposalId.get(left.id);
    const rightResult = resultByProposalId.get(right.id);

    if (leftResult && rightResult && leftResult.rank !== rightResult.rank) {
      return leftResult.rank - rightResult.rank;
    }

    if (leftResult && !rightResult) {
      return -1;
    }

    if (!leftResult && rightResult) {
      return 1;
    }

    return Date.parse(right.createdAt) - Date.parse(left.createdAt);
  });
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  summary: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    justifyContent: 'space-between',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
  },
  gridItem: {
    flexBasis: 320,
    flexGrow: 1,
  },
});
