import { PropsWithChildren } from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

import { colors } from '../../design/theme';
import { radius, spacing } from '../../design/spacing';
import { shadows } from '../../design/shadows';

type CardVariant = 'default' | 'elevated' | 'soft' | 'outline';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

type CardProps = PropsWithChildren<
  ViewProps & {
    selected?: boolean;
    variant?: CardVariant;
    padding?: CardPadding;
  }
>;

export function Card({ children, selected = false, variant = 'default', padding = 'md', style, ...props }: CardProps) {
  return (
    <View {...props} style={[styles.base, styles[variant], styles[padding], selected && styles.selected, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    gap: spacing[3],
  },
  default: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  elevated: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    ...shadows.md,
  },
  soft: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderWidth: 1,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: colors.borderStrong,
    borderWidth: 1,
  },
  selected: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  none: {
    padding: 0,
  },
  sm: {
    padding: spacing[3],
  },
  md: {
    padding: spacing[4],
  },
  lg: {
    padding: spacing[5],
  },
});
