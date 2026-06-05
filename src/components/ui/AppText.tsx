import { PropsWithChildren } from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';

import { colors } from '../../design/theme';
import { typography } from '../../design/typography';

type TextVariant = 'display' | 'title' | 'subtitle' | 'body' | 'bodyStrong' | 'label' | 'caption' | 'eyebrow';

type AppTextProps = PropsWithChildren<
  TextProps & {
    variant?: TextVariant;
  }
>;

export function AppText({ children, variant = 'body', style, ...props }: AppTextProps) {
  return (
    <Text {...props} style={[styles.base, styles[variant], style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: colors.text,
  },
  display: typography.display,
  title: {
    ...typography.title,
  },
  subtitle: {
    ...typography.subtitle,
  },
  body: {
    ...typography.body,
    color: colors.textMuted,
  },
  bodyStrong: {
    ...typography.bodyStrong,
  },
  label: {
    ...typography.label,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.primary,
  },
  caption: {
    ...typography.caption,
    color: colors.textSubtle,
  },
});
