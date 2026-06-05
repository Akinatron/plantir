import { Link, usePathname } from 'expo-router';
import { CalendarDays, CircleDollarSign, Home, MapPinned, UsersRound } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '../../components/ui/AppText';
import { colors } from '../../design/theme';
import { layout, radius, spacing } from '../../design/spacing';
import { typography } from '../../design/typography';

type TripTab = {
  key: 'overview' | 'dates' | 'places' | 'money' | 'group';
  label: string;
  href: string;
  icon: typeof Home;
};

type TripTabBarProps = {
  tripId: string;
};

export function TripTabBar({ tripId }: TripTabBarProps) {
  const pathname = usePathname();
  const activeTab = getActiveTripTab(pathname);
  const tabs: TripTab[] = [
    { key: 'overview', label: 'Overview', href: `/trips/${tripId}`, icon: Home },
    { key: 'dates', label: 'Dates', href: `/trips/${tripId}/date-poll/vote`, icon: CalendarDays },
    { key: 'places', label: 'Places', href: `/trips/${tripId}/destination`, icon: MapPinned },
    { key: 'money', label: 'Money', href: `/trips/${tripId}/expenses`, icon: CircleDollarSign },
    { key: 'group', label: 'Group', href: `/trips/${tripId}/members`, icon: UsersRound },
  ];

  return (
    <View style={styles.shell}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.primaryContent}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.key;

          return (
            <Link key={tab.key} href={tab.href} asChild>
              <Pressable
                accessibilityRole="tab"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected }}
                style={({ pressed }) => [styles.tab, selected && styles.activeTab, pressed && styles.pressed]}
              >
                <Icon color={selected ? colors.primary : colors.textMuted} size={18} strokeWidth={2.2} />
                <AppText style={[styles.tabLabel, selected && styles.activeTabLabel]}>{tab.label}</AppText>
              </Pressable>
            </Link>
          );
        })}
      </ScrollView>
    </View>
  );
}

function getActiveTripTab(pathname: string): TripTab['key'] {
  if (pathname.includes('/date-poll')) {
    return 'dates';
  }

  if (pathname.includes('/destination')) {
    return 'places';
  }

  if (pathname.includes('/expenses')) {
    return 'money';
  }

  if (
    pathname.includes('/members')
    || pathname.includes('/invite')
    || pathname.includes('/settings')
    || pathname.includes('/activity')
  ) {
    return 'group';
  }

  return 'overview';
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.background,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  primaryContent: {
    alignSelf: 'center',
    gap: spacing[2],
    maxWidth: layout.maxContentWidth,
    paddingBottom: spacing[3],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
  },
  tab: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[2],
    minHeight: 42,
    paddingHorizontal: spacing[4],
  },
  activeTab: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.78,
  },
  tabLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  activeTabLabel: {
    color: colors.primary,
  },
});
