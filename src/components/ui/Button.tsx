import { ElementRef, ReactNode, forwardRef } from 'react';
import { ActivityIndicator, Pressable, PressableProps, StyleSheet, View } from 'react-native';

import { colors } from '../../design/theme';
import { radius, spacing } from '../../design/spacing';
import { typography } from '../../design/typography';
import { AppText } from './AppText';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = PressableProps & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

export const Button = forwardRef<ElementRef<typeof Pressable>, ButtonProps>(
  (
    {
      label,
      variant = 'primary',
      size = 'md',
      fullWidth = true,
      loading = false,
      leftIcon,
      rightIcon,
      style,
      disabled,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;
    const labelColor = getLabelColor(variant, isDisabled);

    return (
      <Pressable
        ref={ref}
        accessibilityRole="button"
        accessibilityLabel={props.accessibilityLabel ?? label}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        {...props}
        disabled={isDisabled}
        hitSlop={props.hitSlop ?? 6}
        style={({ pressed }) => [
          styles.base,
          styles[size],
          styles[variant],
          fullWidth && styles.fullWidth,
          isDisabled && styles.disabled,
          pressed && !isDisabled && styles.pressed,
          typeof style === 'function' ? style({ pressed }) : style,
        ]}
      >
        <View style={styles.content}>
          {loading ? <ActivityIndicator color={labelColor} size="small" /> : leftIcon}
          <AppText style={[styles.label, { color: labelColor }]}>{label}</AppText>
          {rightIcon}
        </View>
      </Pressable>
    );
  },
);

Button.displayName = 'Button';

function getLabelColor(variant: ButtonVariant, disabled?: boolean) {
  if (disabled) {
    return colors.textSubtle;
  }

  if (variant === 'primary') {
    return colors.primaryText;
  }

  if (variant === 'danger') {
    return colors.danger;
  }

  return colors.primary;
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 48,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
    justifyContent: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  sm: {
    minHeight: 40,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  md: {
    minHeight: 48,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
  },
  lg: {
    minHeight: 54,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.primarySoft,
  },
  outline: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderWidth: 1,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.coralSoft,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    opacity: 0.78,
  },
  label: {
    ...typography.label,
    textAlign: 'center',
  },
});
