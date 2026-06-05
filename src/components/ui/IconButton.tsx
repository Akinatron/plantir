import { ReactNode } from 'react';
import { Pressable, PressableProps, StyleSheet } from 'react-native';

import { colors } from '../../design/theme';
import { radius } from '../../design/spacing';

type IconButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type IconButtonSize = 'sm' | 'md' | 'lg';

type IconButtonProps = PressableProps & {
  label: string;
  icon: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
};

export function IconButton({ label, icon, variant = 'secondary', size = 'md', style, ...props }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? label}
      {...props}
      hitSlop={props.hitSlop ?? 6}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        styles[variant],
        props.disabled && styles.disabled,
        pressed && !props.disabled && styles.pressed,
        typeof style === 'function' ? style({ pressed }) : style,
      ]}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radius.full,
    justifyContent: 'center',
  },
  sm: {
    height: 36,
    width: 36,
  },
  md: {
    height: 44,
    width: 44,
  },
  lg: {
    height: 52,
    width: 52,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.primarySoft,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.dangerSoft,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
});
