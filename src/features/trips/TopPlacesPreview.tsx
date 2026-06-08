import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../../components/ui/AppText';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/LoadingState';
import { colors } from '../../design/theme';
import { radius, spacing } from '../../design/spacing';
import { DestinationPollResult, DestinationProposal } from '../../types/destination';

type TopPlacesPreviewProps = {
  href: string;
  results: DestinationPollResult[];
  proposals: DestinationProposal[];
  isLoading?: boolean;
  error?: Error | null;
  hasPoll?: boolean;
};

export function TopPlacesPreview({
  href,
  results,
  proposals,
  isLoading = false,
  error,
  hasPoll = false,
}: TopPlacesPreviewProps) {
  const proposalById = new Map(proposals.map((proposal) => [proposal.id, proposal]));
  const topResults = results.slice(0, 3);

  return (
    <Card variant="elevated" padding="lg" style={styles.card}>
      <PreviewHeader title="Top places" href={href} cta={hasPoll ? 'Open places' : 'Start vote'} />

      {isLoading ? <LoadingState label="Loading place results..." /> : null}

      {!isLoading && error ? (
        <EmptyState title="Places hidden" description="Results are unavailable or hidden by trip settings." />
      ) : null}

      {!isLoading && !error && topResults.length === 0 ? (
        <EmptyState
          title={hasPoll ? 'No place ranking yet' : 'No place vote yet'}
          description={hasPoll ? 'Add proposals and collect votes.' : 'Create a place vote after dates are clearer.'}
        />
      ) : null}

      {!isLoading && !error && topResults.length > 0 ? (
        <View style={styles.list}>
          {topResults.map((result) => {
            const proposal = proposalById.get(result.proposalId);

            return (
              <View key={result.id} style={styles.row}>
                <View style={styles.thumbnail}>
                  <AppText variant="label" style={styles.thumbnailText}>
                    {result.rank}
                  </AppText>
                </View>
                <View style={styles.rowCopy}>
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    {proposal?.locationName ?? proposal?.title ?? 'Place proposal'}
                  </AppText>
                  <AppText variant="caption" numberOfLines={1}>
                    {formatPlaceMeta(proposal, result.voteCount)}
                  </AppText>
                </View>
                <AppText variant="label" style={styles.voteCount}>
                  {result.voteCount}
                </AppText>
              </View>
            );
          })}
        </View>
      ) : null}
    </Card>
  );
}

function PreviewHeader({ title, href, cta }: { title: string; href: string; cta: string }) {
  return (
    <View style={styles.header}>
      <AppText variant="subtitle">{title}</AppText>
      <Link href={href} asChild>
        <Pressable accessibilityRole="button" accessibilityLabel={cta} style={styles.headerLink}>
          <AppText variant="label" style={styles.headerLinkText}>
            {cta}
          </AppText>
        </Pressable>
      </Link>
    </View>
  );
}

function formatPlaceMeta(proposal: DestinationProposal | undefined, voteCount: number) {
  const pieces = [`${voteCount} vote${voteCount === 1 ? '' : 's'}`];

  if (proposal?.capacity) {
    pieces.push(`${proposal.capacity} people`);
  }

  if (proposal?.totalPriceCents && proposal.currencyCode) {
    pieces.push(formatMoney(proposal.totalPriceCents, proposal.currencyCode));
  }

  return pieces.join(' | ');
}

function formatMoney(cents: number, currencyCode: string) {
  return new Intl.NumberFormat(undefined, {
    currency: currencyCode,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(cents / 100);
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 280,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
    justifyContent: 'space-between',
  },
  headerLink: {
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  headerLinkText: {
    color: colors.primary,
  },
  list: {
    gap: spacing[3],
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[3],
    padding: spacing[3],
  },
  thumbnail: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSky,
    borderRadius: radius.xl,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  thumbnailText: {
    color: colors.info,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
  },
  voteCount: {
    color: colors.primary,
  },
});
