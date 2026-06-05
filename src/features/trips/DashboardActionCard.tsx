import { Link } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../../components/ui/AppText';
import { Card } from '../../components/ui/Card';
import { colors } from '../../design/theme';
import { radius, spacing } from '../../design/spacing';

type DashboardActionCardProps = {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
  meta?: string;
  tone?: 'sea' | 'coral' | 'sun' | 'sky';
};

export function DashboardActionCard({
  title,
  description,
  href,
  icon,
  meta,
  tone = 'sea',
}: DashboardActionCardProps) {
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${description}`}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      >
        <Card padding="lg" variant="elevated" style={styles.card}>
          <View style={[styles.iconWrap, styles[tone]]}>{icon}</View>
          <View style={styles.copy}>
            <AppText variant="subtitle">{title}</AppText>
            <AppText variant="body">{description}</AppText>
          </View>
          {meta ? <AppText variant="caption">{meta}</AppText> : null}
        </Card>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: radius.lg,
    flex: 1,
    minWidth: 220,
  },
  pressed: {
    opacity: 0.84,
  },
  card: {
    minHeight: 184,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: radius.lg,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  sea: {
    backgroundColor: colors.surfaceSea,
  },
  coral: {
    backgroundColor: colors.surfaceCoral,
  },
  sun: {
    backgroundColor: colors.surfaceSun,
  },
  sky: {
    backgroundColor: colors.surfaceSky,
  },
  copy: {
    flex: 1,
    gap: spacing[1],
  },
});
