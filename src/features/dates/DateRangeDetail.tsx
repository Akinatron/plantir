import { StyleSheet, View } from 'react-native';

import { AppText } from '../../components/ui/AppText';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { colors } from '../../design/theme';
import { radius, spacing } from '../../design/spacing';
import { expandIsoDateRange } from '../../lib/date/dateRange';
import { DateAvailabilityVote, DatePollResult } from '../../types/datePoll';
import { TripMember } from '../../types/trip';

type DateRangeDetailProps = {
  result: DatePollResult | null;
  members: TripMember[];
  votes: DateAvailabilityVote[];
  votesError?: Error | null;
};

export function DateRangeDetail({ result, members, votes, votesError }: DateRangeDetailProps) {
  if (!result) {
    return (
      <Card variant="soft" padding="lg">
        <EmptyState title="Select a range" description="Tap a ranked date range to see member availability." />
      </Card>
    );
  }

  if (votesError) {
    return (
      <Card variant="soft" padding="lg">
        <EmptyState title="Member detail hidden" description="Votes are not visible with the current trip settings." />
      </Card>
    );
  }

  const grouped = groupMembersForRange(result, members, votes);

  return (
    <Card variant="elevated" padding="lg" style={styles.card}>
      <View style={styles.header}>
        <AppText variant="subtitle">{formatDateRange(result.startDate, result.endDate)}</AppText>
        <AppText variant="body">
          {result.availableMemberCount}/{result.totalMemberCount} members counted for this range.
        </AppText>
      </View>

      <MemberSection title="Members counted for this range" members={grouped.counted} tone="counted" />
      <MemberSection title="Members not counted for this range" members={grouped.notCounted} tone="notCounted" />
      <MemberSection title="No answer yet" members={grouped.noAnswer} tone="pending" />
    </Card>
  );
}

function MemberSection({
  title,
  members,
  tone,
}: {
  title: string;
  members: TripMember[];
  tone: 'counted' | 'notCounted' | 'pending';
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <AppText variant="bodyStrong">{title}</AppText>
        <View style={[styles.countPill, styles[tone]]}>
          <AppText variant="caption" style={styles.countText}>
            {members.length}
          </AppText>
        </View>
      </View>
      {members.length === 0 ? (
        <AppText variant="caption">No members in this group.</AppText>
      ) : (
        <View style={styles.memberList}>
          {members.map((member) => (
            <View key={member.id} style={styles.memberRow}>
              <Avatar name={member.displayName ?? member.role} uri={member.avatarUrl} size="sm" />
              <View style={styles.memberCopy}>
                <AppText variant="label">{member.displayName ?? 'Unnamed member'}</AppText>
                <AppText variant="caption">{member.role}</AppText>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function groupMembersForRange(result: DatePollResult, members: TripMember[], votes: DateAvailabilityVote[]) {
  const dates = expandIsoDateRange(result.startDate, result.endDate);
  const votesByUserAndDate = new Map<string, DateAvailabilityVote>();

  votes.forEach((vote) => {
    votesByUserAndDate.set(`${vote.userId}:${vote.date}`, vote);
  });

  const counted: TripMember[] = [];
  const notCounted: TripMember[] = [];
  const noAnswer: TripMember[] = [];

  members.forEach((member) => {
    const rangeVotes = dates.map((date) => votesByUserAndDate.get(`${member.userId}:${date}`));
    const answeredCount = rangeVotes.filter(Boolean).length;

    if (answeredCount === 0) {
      noAnswer.push(member);
      return;
    }

    const availableForAllDays = rangeVotes.every((vote) => vote?.status === 'available' || vote?.status === 'preferred');

    if (availableForAllDays) {
      counted.push(member);
      return;
    }

    notCounted.push(member);
  });

  return { counted, noAnswer, notCounted };
}

function formatDateRange(startDate: string, endDate: string) {
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}

const styles = StyleSheet.create({
  card: {
    gap: spacing[5],
  },
  header: {
    gap: spacing[1],
  },
  section: {
    gap: spacing[3],
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
    justifyContent: 'space-between',
  },
  countPill: {
    alignItems: 'center',
    borderRadius: radius.full,
    minWidth: 28,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  counted: {
    backgroundColor: colors.primarySoft,
  },
  notCounted: {
    backgroundColor: colors.coralSoft,
  },
  pending: {
    backgroundColor: colors.surfaceSun,
  },
  countText: {
    color: colors.text,
    fontWeight: '800',
  },
  memberList: {
    gap: spacing[2],
  },
  memberRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[3],
    padding: spacing[3],
  },
  memberCopy: {
    flex: 1,
    minWidth: 0,
  },
});
