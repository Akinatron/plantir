import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '../../design/theme';
import { radius, spacing } from '../../design/spacing';
import { typography } from '../../design/typography';
import { AppText } from './AppText';

export type SegmentedTab<TValue extends string> = {
  value: TValue;
  label: string;
  badge?: string | number;
};

type SegmentedTabsProps<TValue extends string> = {
  tabs: SegmentedTab<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
  accessibilityLabel?: string;
};

export function SegmentedTabs<TValue extends string>({
  tabs,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedTabsProps<TValue>) {
  return (
    <View style={styles.container} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
      {tabs.map((tab) => {
        const selected = tab.value === value;

        return (
          <Pressable
            key={tab.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
            onPress={() => onChange(tab.value)}
            style={({ pressed }) => [styles.tab, selected && styles.selectedTab, pressed && styles.pressed]}
          >
            <AppText style={[styles.label, selected && styles.selectedLabel]}>{tab.label}</AppText>
            {tab.badge !== undefined ? (
              <View style={[styles.badge, selected && styles.selectedBadge]}>
                <AppText style={[styles.badgeText, selected && styles.selectedBadgeText]}>{String(tab.badge)}</AppText>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[1],
    padding: spacing[1],
  },
  tab: {
    alignItems: 'center',
    borderRadius: radius.md,
    flex: 1,
    flexDirection: 'row',
    gap: spacing[1],
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
  },
  selectedTab: {
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.78,
  },
  label: {
    ...typography.label,
    color: colors.textMuted,
    textAlign: 'center',
  },
  selectedLabel: {
    color: colors.primary,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: colors.border,
    borderRadius: radius.full,
    minWidth: 22,
    paddingHorizontal: spacing[1],
  },
  selectedBadge: {
    backgroundColor: colors.primarySoft,
  },
  badgeText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
  },
  selectedBadgeText: {
    color: colors.primary,
  },
});
