import { ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import { BedDouble, Bath, ExternalLink, MapPin, Users, Vote } from 'lucide-react-native';

import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { colors } from '../../design/theme';
import { radius, spacing } from '../../design/spacing';
import { formatCents } from '../../lib/algorithms/money';
import {
  DestinationCustomField,
  DestinationPollResult,
  DestinationProposal,
} from '../../types/destination';
import { useDestinationCustomFieldValuesQuery, useProposalImagesQuery } from '../../hooks/useDestination';
import { CustomFieldRenderer } from './CustomFieldRenderer';
import { PlaceImageGallery } from './PlaceImageGallery';

type PlaceCardProps = {
  tripId: string;
  proposal: DestinationProposal;
  result?: DestinationPollResult;
  customFields: DestinationCustomField[];
  selected?: boolean;
  showVotes?: boolean;
  votingDisabled?: boolean;
  voting?: boolean;
  onVote: () => void;
};

export function PlaceCard({
  tripId,
  proposal,
  result,
  customFields,
  selected = false,
  showVotes = true,
  votingDisabled = false,
  voting = false,
  onVote,
}: PlaceCardProps) {
  const imagesQuery = useProposalImagesQuery(proposal.id);
  const customValuesQuery = useDestinationCustomFieldValuesQuery(proposal.id);
  const price =
    proposal.totalPriceCents !== null && proposal.currencyCode
      ? formatCents(proposal.totalPriceCents, proposal.currencyCode)
      : 'No price yet';
  const voteLabel = showVotes
    ? `${result?.voteCount ?? 0} vote${(result?.voteCount ?? 0) === 1 ? '' : 's'}`
    : 'Votes hidden';

  return (
    <Card variant="elevated" padding="none" selected={selected} style={styles.card}>
      <View style={styles.media}>
        <PlaceImageGallery images={imagesQuery.data ?? []} title={proposal.title} compact />
        {showVotes && result?.rank ? (
          <View style={styles.rankBadge}>
            <AppText variant="label" style={styles.rankText}>
              #{result.rank}
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <AppText variant="subtitle" numberOfLines={2}>
              {proposal.title}
            </AppText>
            {proposal.url ? (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`Open ${proposal.title} listing`}
                onPress={() => void Linking.openURL(proposal.url ?? '')}
                style={styles.linkRow}
              >
                <ExternalLink color={colors.primary} size={14} />
                <AppText variant="caption" numberOfLines={1} style={styles.linkText}>
                  {formatUrlLabel(proposal.url)}
                </AppText>
              </Pressable>
            ) : null}
          </View>
          {selected ? <Chip label="Your vote" tone="sea" /> : null}
        </View>

        <View style={styles.metaGrid}>
          <Meta icon={<MapPin color={colors.primary} size={16} />} label={proposal.locationName ?? 'No location'} />
          <Meta icon={<Vote color={colors.primary} size={16} />} label={voteLabel} />
          <Meta icon={<Users color={colors.primary} size={16} />} label={formatNumber(proposal.capacity, 'guest')} />
          <Meta icon={<BedDouble color={colors.primary} size={16} />} label={formatNumber(proposal.bedrooms, 'bedroom')} />
          <Meta icon={<Bath color={colors.primary} size={16} />} label={formatNumber(proposal.bathrooms, 'bath')} />
          <Meta label={price} strong />
        </View>

        <CustomFieldRenderer
          fields={customFields}
          values={customValuesQuery.data ?? []}
          currencyCode={proposal.currencyCode}
          cardOnly
          compact
        />

        <View style={styles.actions}>
          <Link href={`/trips/${tripId}/destination/${proposal.id}`} asChild>
            <Button label="Details" variant="outline" fullWidth={false} />
          </Link>
          <Button
            label={selected ? 'Selected' : 'Vote'}
            fullWidth={false}
            loading={voting}
            disabled={selected || votingDisabled}
            onPress={onVote}
          />
        </View>
      </View>
    </Card>
  );
}

function Meta({ icon, label, strong = false }: { icon?: ReactNode; label: string; strong?: boolean }) {
  return (
    <View style={styles.metaItem}>
      {icon}
      <AppText variant={strong ? 'bodyStrong' : 'caption'} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

function formatNumber(value: number | null, singular: string): string {
  if (value === null) {
    return `No ${singular}s`;
  }

  return `${value} ${singular}${value === 1 ? '' : 's'}`;
}

function formatUrlLabel(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  media: {
    position: 'relative',
  },
  rankBadge: {
    alignItems: 'center',
    backgroundColor: colors.sun,
    borderRadius: radius.full,
    height: 38,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing[3],
    top: spacing[3],
    width: 38,
  },
  rankText: {
    color: colors.text,
  },
  body: {
    gap: spacing[4],
    padding: spacing[4],
  },
  titleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing[3],
    justifyContent: 'space-between',
  },
  titleCopy: {
    flex: 1,
    gap: spacing[1],
  },
  linkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[1],
  },
  linkText: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  metaItem: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[1],
    minHeight: 38,
    paddingHorizontal: spacing[3],
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    justifyContent: 'flex-end',
  },
});
