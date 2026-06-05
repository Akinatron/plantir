import { ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { ExternalLink, MapPin, Users, BedDouble, Bath } from 'lucide-react-native';

import { AppText } from '../../components/ui/AppText';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Screen } from '../../components/ui/Screen';
import { colors } from '../../design/theme';
import { radius, spacing } from '../../design/spacing';
import { formatCents } from '../../lib/algorithms/money';
import {
  useDestinationCustomFieldsQuery,
  useDestinationCustomFieldValuesQuery,
  useDestinationProposalQuery,
  useProposalImagesQuery,
} from '../../hooks/useDestination';
import { CustomFieldRenderer } from './CustomFieldRenderer';
import { PlaceImageGallery } from './PlaceImageGallery';

type PlaceDetailProps = {
  tripId: string;
  proposalId: string;
};

export function PlaceDetail({ tripId, proposalId }: PlaceDetailProps) {
  const proposalQuery = useDestinationProposalQuery(proposalId);
  const imagesQuery = useProposalImagesQuery(proposalId);
  const proposal = proposalQuery.data ?? null;
  const fieldsQuery = useDestinationCustomFieldsQuery(tripId, proposal?.pollId);
  const valuesQuery = useDestinationCustomFieldValuesQuery(proposalId);

  if (proposalQuery.isLoading) {
    return <LoadingState label="Loading place..." />;
  }

  if (proposalQuery.isError) {
    return <ErrorState title="Place failed to load" message={proposalQuery.error.message} />;
  }

  if (!proposal) {
    return (
      <Screen centered>
        <EmptyState title="Place not found" description="This proposal may have been removed." />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <PageHeader
        eyebrow="Place"
        title={proposal.title}
        description={proposal.locationName ?? 'Accommodation proposal'}
      />

      <PlaceImageGallery images={imagesQuery.data ?? []} title={proposal.title} />

      {proposal.url ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Open ${proposal.title} listing`}
          onPress={() => void Linking.openURL(proposal.url ?? '')}
          style={styles.externalLink}
        >
          <ExternalLink color={colors.primary} size={18} />
          <AppText variant="bodyStrong" style={styles.linkText} numberOfLines={1}>
            {proposal.url}
          </AppText>
        </Pressable>
      ) : null}

      <View style={styles.grid}>
        <Stat label="Location" value={proposal.locationName ?? 'Not set'} icon={<MapPin color={colors.primary} size={18} />} />
        <Stat
          label="Total price"
          value={
            proposal.totalPriceCents !== null && proposal.currencyCode
              ? formatCents(proposal.totalPriceCents, proposal.currencyCode)
              : 'Not set'
          }
        />
        <Stat label="Capacity" value={formatCount(proposal.capacity, 'guest')} icon={<Users color={colors.primary} size={18} />} />
        <Stat label="Bedrooms" value={formatCount(proposal.bedrooms, 'bedroom')} icon={<BedDouble color={colors.primary} size={18} />} />
        <Stat label="Bathrooms" value={formatCount(proposal.bathrooms, 'bath')} icon={<Bath color={colors.primary} size={18} />} />
      </View>

      {proposal.description ? (
        <Card>
          <AppText variant="subtitle">Description</AppText>
          <AppText>{proposal.description}</AppText>
        </Card>
      ) : null}

      <Card>
        <AppText variant="subtitle">Comparison details</AppText>
        {fieldsQuery.isLoading || valuesQuery.isLoading ? (
          <LoadingState label="Loading custom fields..." />
        ) : (
          <CustomFieldRenderer
            fields={fieldsQuery.data ?? []}
            values={valuesQuery.data ?? []}
            currencyCode={proposal.currencyCode}
          />
        )}
      </Card>
    </Screen>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <Card variant="soft" style={styles.stat}>
      <View style={styles.statTop}>
        {icon}
        <AppText variant="caption">{label}</AppText>
      </View>
      <AppText variant="bodyStrong">{value}</AppText>
    </Card>
  );
}

function formatCount(value: number | null, singular: string): string {
  if (value === null) {
    return 'Not set';
  }

  return `${value} ${singular}${value === 1 ? '' : 's'}`;
}

const styles = StyleSheet.create({
  externalLink: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[2],
    minHeight: 48,
    paddingHorizontal: spacing[3],
  },
  linkText: {
    color: colors.primary,
    flex: 1,
    textDecorationLine: 'underline',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  stat: {
    flexBasis: 160,
    flexGrow: 1,
  },
  statTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
});
