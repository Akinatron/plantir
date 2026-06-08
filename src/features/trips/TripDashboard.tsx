import { Link } from 'expo-router';
import { CalendarDays, CircleDollarSign, MapPinned, Settings, UsersRound } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../components/feedback/InlineNotice';
import { AppText } from '../../components/ui/AppText';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { IconButton } from '../../components/ui/IconButton';
import { LoadingState } from '../../components/ui/LoadingState';
import { Screen } from '../../components/ui/Screen';
import { colors } from '../../design/theme';
import { radius, spacing } from '../../design/spacing';
import { useDatePollBundleQuery, useDatePollResultsQuery } from '../../hooks/useDatePoll';
import { useDestinationBundleQuery, useDestinationResultsQuery } from '../../hooks/useDestination';
import { useExpensesQuery } from '../../hooks/useExpenses';
import { useTripMembersQuery, useTripQuery } from '../../hooks/useTrips';
import { Trip } from '../../types/trip';
import { DashboardActionCard } from './DashboardActionCard';
import { TopDatesPreview } from './TopDatesPreview';
import { TopPlacesPreview } from './TopPlacesPreview';
import { TripStatusBadge } from './TripStatusBadge';

type TripDashboardProps = {
  tripId: string;
};

export function TripDashboard({ tripId }: TripDashboardProps) {
  const tripQuery = useTripQuery(tripId);
  const membersQuery = useTripMembersQuery(tripId);
  const datePollBundleQuery = useDatePollBundleQuery(tripId);
  const destinationBundleQuery = useDestinationBundleQuery(tripId);
  const expensesQuery = useExpensesQuery(tripId);
  const datePollId = datePollBundleQuery.data?.poll?.id;
  const destinationPollId = destinationBundleQuery.data?.poll?.id;
  const dateResultsQuery = useDatePollResultsQuery(datePollId);
  const destinationResultsQuery = useDestinationResultsQuery(destinationPollId);

  if (tripQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading trip dashboard..." />
      </Screen>
    );
  }

  if (!tripQuery.data) {
    return (
      <Screen>
        <InlineNotice
          title="Trip unavailable"
          message={tripQuery.error?.message ?? 'This trip does not exist or you do not have access.'}
          tone="error"
        />
      </Screen>
    );
  }

  const trip = tripQuery.data;
  const members = membersQuery.data ?? [];
  const proposals = destinationBundleQuery.data?.proposals ?? [];
  const expenses = expensesQuery.data ?? [];

  return (
    <Screen scroll contentContainerStyle={styles.screenContent}>
      <View style={styles.heroCard}>
        <View style={styles.heroAccent} />
        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <TripStatusBadge trip={trip} />
            <AppText variant="display">{trip.title}</AppText>
            {trip.description ? <AppText variant="body">{trip.description}</AppText> : null}
            <AppText variant="caption">{formatTripDates(trip)}</AppText>
          </View>

          <View style={styles.heroActions}>
            <Link href={`/trips/${trip.id}/settings`} asChild>
              <IconButton
                label="Trip settings"
                icon={<Settings color={colors.primary} size={20} strokeWidth={2.2} />}
                variant="secondary"
              />
            </Link>
          </View>
        </View>

        <View style={styles.heroStats}>
          <HeroStat label="Dates" value={trip.startsOn && trip.endsOn ? formatShortRange(trip.startsOn, trip.endsOn) : 'Open'} />
          <HeroStat label="Places" value={`${proposals.length} option${proposals.length === 1 ? '' : 's'}`} />
          <HeroStat label="Group" value={`${members.length} member${members.length === 1 ? '' : 's'}`} />
        </View>
      </View>

      <View style={styles.previewGrid}>
        <TopDatesPreview
          href={datePollId ? `/trips/${trip.id}/date-poll/results` : `/trips/${trip.id}/date-poll/setup`}
          results={dateResultsQuery.data ?? []}
          isLoading={datePollBundleQuery.isLoading || dateResultsQuery.isLoading}
          error={datePollBundleQuery.error ?? dateResultsQuery.error ?? null}
          hasPoll={Boolean(datePollId)}
        />
        <TopPlacesPreview
          href={destinationPollId ? `/trips/${trip.id}/destination/results` : `/trips/${trip.id}/destination/setup`}
          results={destinationResultsQuery.data ?? []}
          proposals={proposals}
          isLoading={destinationBundleQuery.isLoading || destinationResultsQuery.isLoading}
          error={destinationBundleQuery.error ?? destinationResultsQuery.error ?? null}
          hasPoll={Boolean(destinationPollId)}
        />
      </View>

      <View style={styles.summaryGrid}>
        <MembersSummary tripId={trip.id} members={members} isLoading={membersQuery.isLoading} error={membersQuery.error} />
        <Card variant="soft" padding="lg" style={styles.summaryCard}>
          <AppText variant="eyebrow">Money</AppText>
          <AppText variant="subtitle">{expenses.length} expenses</AppText>
          <AppText variant="body">{formatExpenseTotal(expenses)}</AppText>
        </Card>
      </View>

      <View style={styles.actionGrid}>
        <DashboardActionCard
          title="Dates"
          description="Vote availability and review the ranked date ranges."
          href={datePollId ? `/trips/${trip.id}/date-poll/vote` : `/trips/${trip.id}/date-poll/setup`}
          icon={<CalendarDays color={colors.primary} size={22} strokeWidth={2.2} />}
          meta={datePollBundleQuery.data?.poll ? `Poll ${datePollBundleQuery.data.poll.status}` : 'No poll yet'}
          tone="sea"
        />
        <DashboardActionCard
          title="Places"
          description="Compare accommodation proposals and vote for one."
          href={destinationPollId ? `/trips/${trip.id}/destination` : `/trips/${trip.id}/destination/setup`}
          icon={<MapPinned color={colors.info} size={22} strokeWidth={2.2} />}
          meta={`${proposals.length} proposal${proposals.length === 1 ? '' : 's'}`}
          tone="sky"
        />
        <DashboardActionCard
          title="Money"
          description="Add shared costs, review balances, and settle payments."
          href={`/trips/${trip.id}/expenses`}
          icon={<CircleDollarSign color={colors.warning} size={22} strokeWidth={2.2} />}
          meta={`${expenses.length} expense${expenses.length === 1 ? '' : 's'}`}
          tone="sun"
        />
        <DashboardActionCard
          title="Group"
          description="Invite people, manage members, and review trip settings."
          href={`/trips/${trip.id}/members`}
          icon={<UsersRound color={colors.coral} size={22} strokeWidth={2.2} />}
          meta={`${members.length} member${members.length === 1 ? '' : 's'}`}
          tone="coral"
        />
      </View>
    </Screen>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroStat}>
      <AppText variant="caption">{label}</AppText>
      <AppText variant="bodyStrong" numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

function MembersSummary({
  tripId,
  members,
  isLoading,
  error,
}: {
  tripId: string;
  members: { id: string; displayName: string | null; avatarUrl: string | null; role: string }[];
  isLoading: boolean;
  error: Error | null;
}) {
  return (
    <Card variant="soft" padding="lg" style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <View>
          <AppText variant="eyebrow">Members</AppText>
          <AppText variant="subtitle">{isLoading ? 'Loading...' : `${members.length} joined`}</AppText>
        </View>
        <Link href={`/trips/${tripId}/members`} asChild>
          <IconButton
            label="Open group"
            icon={<UsersRound color={colors.primary} size={20} strokeWidth={2.2} />}
            variant="secondary"
          />
        </Link>
      </View>

      {error ? <AppText variant="caption">{error.message}</AppText> : null}

      <View style={styles.avatarRow}>
        {members.slice(0, 5).map((member) => (
          <View key={member.id} style={styles.avatarItem}>
            <Avatar name={member.displayName ?? member.role} uri={member.avatarUrl} size="sm" />
          </View>
        ))}
        {members.length > 5 ? (
          <View style={styles.moreMembers}>
            <AppText variant="caption">+{members.length - 5}</AppText>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

function formatTripDates(trip: Trip) {
  if (!trip.startsOn || !trip.endsOn) {
    return `Timezone: ${trip.timezone}`;
  }

  return `${formatDate(trip.startsOn)} - ${formatDate(trip.endsOn)} | ${trip.timezone}`;
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatShortRange(startDate: string, endDate: string) {
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

function formatExpenseTotal(expenses: { amountCents: number; currencyCode: string }[]) {
  if (expenses.length === 0) {
    return 'No shared costs yet';
  }

  const totals = new Map<string, number>();
  expenses.forEach((expense) => {
    totals.set(expense.currencyCode, (totals.get(expense.currencyCode) ?? 0) + expense.amountCents);
  });

  return Array.from(totals.entries())
    .map(([currencyCode, cents]) =>
      new Intl.NumberFormat(undefined, {
        currency: currencyCode,
        maximumFractionDigits: 0,
        style: 'currency',
      }).format(cents / 100),
    )
    .join(' + ');
}

const styles = StyleSheet.create({
  screenContent: {
    gap: spacing[5],
    paddingBottom: spacing[10],
    paddingTop: spacing[5],
  },
  heroCard: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: radius.xxl,
    borderWidth: 1,
    gap: spacing[5],
    overflow: 'hidden',
    padding: spacing[5],
    position: 'relative',
  },
  heroAccent: {
    backgroundColor: colors.surfaceSea,
    bottom: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    width: 160,
  },
  hero: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
    justifyContent: 'space-between',
  },
  heroCopy: {
    flex: 1,
    gap: spacing[2],
    minWidth: 280,
  },
  heroActions: {
    alignItems: 'flex-end',
    zIndex: 1,
  },
  heroStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    zIndex: 1,
  },
  heroStat: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    minWidth: 150,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  previewGrid: {
    alignItems: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
  },
  summaryGrid: {
    alignItems: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
  },
  summaryCard: {
    flex: 1,
    minWidth: 260,
  },
  summaryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  avatarRow: {
    flexDirection: 'row',
    minHeight: 36,
  },
  avatarItem: {
    marginRight: -spacing[2],
  },
  moreMembers: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  actionGrid: {
    alignItems: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
  },
});
