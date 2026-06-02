/**
 * Button — primitivo base del design system.
 *
 * Variants: primary, secondary, tertiary, danger, ghost.
 * Sizes: sm, md, lg (todos con touch target ≥44dp).
 *
 * Mantiene el contrato del inventario de Fase 1 (docs/01-ux/components.md).
 */

import { Pressable, Text, View, ActivityIndicator } from 'react-native';
import type { ReactNode, ComponentProps } from 'react';

type Variant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<ComponentProps<typeof Pressable>, 'children'> {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  haptic?: 'light' | 'medium' | 'none';
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const variantClasses: Record<Variant, { container: string; text: string }> = {
  primary: {
    container: 'bg-primary-500 active:bg-primary-600',
    text: 'text-white',
  },
  secondary: {
    container: 'bg-secondary-500 active:bg-secondary-700',
    text: 'text-white',
  },
  tertiary: {
    container: 'bg-neutral-100 active:bg-neutral-200 border border-neutral-200',
    text: 'text-neutral-800',
  },
  danger: {
    container: 'bg-danger active:opacity-80',
    text: 'text-white',
  },
  ghost: {
    container: 'bg-transparent active:bg-neutral-100',
    text: 'text-primary-500',
  },
};

const sizeClasses: Record<Size, { container: string; text: string }> = {
  sm: { container: 'h-9 px-3 rounded-md', text: 'text-body-sm' },
  md: { container: 'h-11 px-4 rounded-md', text: 'text-body' },
  lg: { container: 'h-13 px-6 rounded-lg', text: 'text-body-lg' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  loading = false,
  disabled = false,
  fullWidth = false,
  haptic = 'light',
  testID,
  accessibilityLabel,
  accessibilityHint,
  ...pressableProps
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const v = variantClasses[variant];
  const s = sizeClasses[size];

  return (
    <Pressable
      {...pressableProps}
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
      className={[
        'flex-row items-center justify-center gap-2',
        s.container,
        v.container,
        fullWidth ? 'w-full' : 'self-start',
        isDisabled ? 'opacity-50' : '',
      ].join(' ')}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'tertiary' || variant === 'ghost' ? '#332E27' : 'white'} />
      ) : (
        <>
          {leftIcon ? <View>{leftIcon}</View> : null}
          <Text className={`font-semibold ${v.text} ${s.text}`}>{label}</Text>
          {rightIcon ? <View>{rightIcon}</View> : null}
        </>
      )}
    </Pressable>
  );
}
