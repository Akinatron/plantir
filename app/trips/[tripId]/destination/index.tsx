import { Link, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../../../src/components/feedback/InlineNotice';
import { LoadingState } from '../../../../src/components/feedback/LoadingState';
import { PlaceholderState } from '../../../../src/components/feedback/PlaceholderState';
import { AppText } from '../../../../src/components/ui/AppText';
import { Button } from '../../../../src/components/ui/Button';
import { Screen } from '../../../../src/components/ui/Screen';
import { useAuth } from '../../../../src/features/auth/AuthProvider';
import {
  useDestinationBundleQuery,
  useUserDestinationVoteQuery,
  useVoteForDestinationProposalMutation,
} from '../../../../src/hooks/useDestination';
import { formatCents } from '../../../../src/lib/algorithms/money';
import { DestinationProposal } from '../../../../src/types/destination';

export default function DestinationProposalsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { user } = useAuth();
  const bundleQuery = useDestinationBundleQuery(tripId);
  const poll = bundleQuery.data?.poll;
  const voteQuery = useUserDestinationVoteQuery(poll?.id, user?.id);
  const voteMutation = useVoteForDestinationProposalMutation(tripId);

  if (bundleQuery.isLoading || voteQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading proposals..." />
      </Screen>
    );
  }

  if (!poll) {
    return (
      <Screen>
        <PlaceholderState title="No destination poll" description="Start destination voting before adding proposals." />
      </Screen>
    );
  }

  const isClosed = poll.status === 'closed';

  return (
    <Screen>
      <FlatList
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <AppText variant="eyebrow">Destination</AppText>
              <AppText variant="title">Proposals</AppText>
              <AppText>Vote for one accommodation. You can change your vote until the poll closes.</AppText>
            </View>

            {voteMutation.error ? (
              <InlineNotice title="Vote failed" message={voteMutation.error.message} tone="error" />
            ) : null}

            {voteMutation.isSuccess ? <InlineNotice title="Vote saved" tone="success" /> : null}

            <View style={styles.actions}>
              <Link href={`/trips/${tripId}/destination/create?pollId=${poll.id}`} asChild>
                <Button label="Add proposal" disabled={isClosed} />
              </Link>
              <Link href={`/trips/${tripId}/destination/results`} asChild>
                <Button label="View results" variant="secondary" />
              </Link>
            </View>
          </View>
        }
        contentContainerStyle={styles.list}
        data={bundleQuery.data?.proposals ?? []}
        keyExtractor={(proposal) => proposal.id}
        ListEmptyComponent={
          <PlaceholderState title="No proposals yet" description="Add accommodation options for the group to compare." />
        }
        renderItem={({ item }) => (
          <ProposalRow
            proposal={item}
            tripId={tripId}
            selected={voteQuery.data?.proposalId === item.id}
            disabled={isClosed || voteMutation.isPending || !user}
            onVote={() => {
              if (!user) {
                return;
              }

              voteMutation.mutate({
                tripId,
                pollId: poll.id,
                proposalId: item.id,
                userId: user.id,
              });
            }}
          />
        )}
      />
    </Screen>
  );
}

function ProposalRow({
  proposal,
  tripId,
  selected,
  disabled,
  onVote,
}: {
  proposal: DestinationProposal;
  tripId: string;
  selected: boolean;
  disabled: boolean;
  onVote: () => void;
}) {
  return (
    <View style={[styles.card, selected && styles.selectedCard]}>
      <Link href={`/trips/${tripId}/destination/${proposal.id}`} asChild>
        <Pressable style={styles.cardLink}>
          <AppText variant="subtitle">{proposal.title}</AppText>
          {proposal.locationName ? <AppText>{proposal.locationName}</AppText> : null}
          {proposal.totalPriceCents !== null && proposal.currencyCode ? (
            <AppText>{formatCents(proposal.totalPriceCents, proposal.currencyCode)}</AppText>
          ) : null}
          {proposal.capacity ? <AppText>Capacity: {proposal.capacity}</AppText> : null}
        </Pressable>
      </Link>
      <Button
        label={selected ? 'Selected' : 'Vote'}
        variant={selected ? 'secondary' : 'primary'}
        onPress={onVote}
        disabled={disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 16,
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
    gap: 12,
    padding: 16,
  },
  selectedCard: {
    borderColor: '#0F6B57',
  },
  cardLink: {
    gap: 8,
  },
});
