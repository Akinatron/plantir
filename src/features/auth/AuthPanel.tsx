import { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '../../components/ui/AppText';
import { Card } from '../../components/ui/Card';
import { colors } from '../../design/theme';
import { layout, radius, spacing } from '../../design/spacing';

type AuthPanelProps = PropsWithChildren<{
  title: string;
  description: string;
  eyebrow?: string;
  accessory?: ReactNode;
  footer?: ReactNode;
}>;

export function AuthPanel({ title, description, eyebrow, accessory, footer, children }: AuthPanelProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <View style={styles.mark}>
          <AppText style={styles.markText}>P</AppText>
        </View>
        <View style={styles.heroCopy}>
          {eyebrow ? <AppText variant="eyebrow">{eyebrow}</AppText> : null}
          <AppText variant="display">{title}</AppText>
          <AppText variant="body">{description}</AppText>
        </View>
      </View>

      <Card variant="elevated" padding="lg" style={styles.card}>
        {accessory}
        {children}
      </Card>

      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    gap: spacing[5],
    maxWidth: 520,
    width: '100%',
  },
  hero: {
    gap: spacing[4],
  },
  mark: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  markText: {
    color: colors.primaryText,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  heroCopy: {
    gap: spacing[2],
  },
  card: {
    gap: spacing[5],
  },
  footer: {
    alignSelf: 'center',
    maxWidth: layout.maxContentWidth,
  },
});
