/**
 * Card — contenedor con elevation y padding consistente.
 */

import { View, Pressable } from 'react-native';
import type { ReactNode, ComponentProps } from 'react';

type Variant = 'raised' | 'flat' | 'outlined';

interface CardProps extends ComponentProps<typeof View> {
  children: ReactNode;
  variant?: Variant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const variantClasses: Record<Variant, string> = {
  raised: 'bg-surface-raised shadow-sm',
  flat: 'bg-surface-raised',
  outlined: 'bg-surface-raised border border-neutral-200',
};

const paddingClasses = {
  none: '',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
} as const;

export function Card({
  children,
  variant = 'raised',
  padding = 'md',
  onPress,
  testID,
  accessibilityLabel,
  accessibilityHint,
  ...viewProps
}: CardProps) {
  const containerClass = [
    'rounded-md',
    variantClasses[variant],
    paddingClasses[padding],
  ].join(' ');

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        testID={testID}
        className={`active:opacity-80 ${containerClass}`}
        {...(viewProps as ComponentProps<typeof Pressable>)}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      className={containerClass}
      {...viewProps}
    >
      {children}
    </View>
  );
}
