import { useLocalSearchParams } from 'expo-router';
import { Image, ScrollView, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../../../src/components/feedback/InlineNotice';
import { LoadingState } from '../../../../src/components/feedback/LoadingState';
import { PlaceholderState } from '../../../../src/components/feedback/PlaceholderState';
import { AppText } from '../../../../src/components/ui/AppText';
import { Screen } from '../../../../src/components/ui/Screen';
import {
  useDestinationProposalQuery,
  useProposalImagesQuery,
} from '../../../../src/hooks/useDestination';
import { formatCents } from '../../../../src/lib/algorithms/money';

export default function DestinationProposalDetailScreen() {
  const { proposalId } = useLocalSearchParams<{ proposalId: string }>();
  const proposalQuery = useDestinationProposalQuery(proposalId);
  const imagesQuery = useProposalImagesQuery(proposalId);

  if (proposalQuery.isLoading || imagesQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading proposal..." />
      </Screen>
    );
  }

  if (!proposalQuery.data) {
    return (
      <Screen>
        <PlaceholderState title="Proposal unavailable" description="This proposal does not exist or is not accessible." />
      </Screen>
    );
  }

  const proposal = proposalQuery.data;
  const image = imagesQuery.data?.find((item) => item.signedUrl);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        {imagesQuery.error ? (
          <InlineNotice title="Images failed to load" message={imagesQuery.error.message} tone="error" />
        ) : null}

        {image?.signedUrl ? <Image source={{ uri: image.signedUrl }} style={styles.image} /> : null}

        <View style={styles.header}>
          <AppText variant="eyebrow">Proposal</AppText>
          <AppText variant="title">{proposal.title}</AppText>
          {proposal.locationName ? <AppText>{proposal.locationName}</AppText> : null}
          {proposal.url ? <AppText>{proposal.url}</AppText> : null}
        </View>

        {proposal.description ? <AppText>{proposal.description}</AppText> : null}

        <View style={styles.grid}>
          {proposal.totalPriceCents !== null && proposal.currencyCode ? (
            <Info label="Total" value={formatCents(proposal.totalPriceCents, proposal.currencyCode)} />
          ) : null}
          {proposal.pricePerPersonCents !== null && proposal.currencyCode ? (
            <Info label="Per person" value={formatCents(proposal.pricePerPersonCents, proposal.currencyCode)} />
          ) : null}
          {proposal.capacity ? <Info label="Capacity" value={String(proposal.capacity)} /> : null}
          {proposal.bedrooms !== null ? <Info label="Bedrooms" value={String(proposal.bedrooms)} /> : null}
          {proposal.bathrooms !== null ? <Info label="Bathrooms" value={String(proposal.bathrooms)} /> : null}
        </View>

        <ListBlock title="Pros" items={proposal.pros} />
        <ListBlock title="Cons" items={proposal.cons} />
      </ScrollView>
    </Screen>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoCard}>
      <AppText variant="eyebrow">{label}</AppText>
      <AppText variant="subtitle">{value}</AppText>
    </View>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.block}>
      <AppText variant="subtitle">{title}</AppText>
      {items.map((item) => (
        <AppText key={item}>- {item}</AppText>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 18,
    paddingVertical: 24,
  },
  image: {
    aspectRatio: 4 / 3,
    borderRadius: 8,
    width: '100%',
  },
  header: {
    gap: 8,
  },
  grid: {
    gap: 10,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAECF0',
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  block: {
    gap: 8,
  },
});
