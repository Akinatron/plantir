import { ElementRef, forwardRef } from 'react';
import { Pressable, PressableProps, StyleSheet, Text } from 'react-native';

type ButtonVariant = 'primary' | 'secondary';

type ButtonProps = PressableProps & {
  label: string;
  variant?: ButtonVariant;
};

export const Button = forwardRef<ElementRef<typeof Pressable>, ButtonProps>(
  ({ label, variant = 'primary', style, ...props }, ref) => {
    return (
      <Pressable
        ref={ref}
        accessibilityRole="button"
        {...props}
        style={({ pressed }) => [
          styles.base,
          styles[variant],
          props.disabled && styles.disabled,
          pressed && styles.pressed,
          typeof style === 'function' ? style({ pressed }) : style,
        ]}
      >
        <Text style={[styles.label, variant === 'secondary' && styles.secondaryLabel]}>{label}</Text>
      </Pressable>
    );
  },
);

Button.displayName = 'Button';

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primary: {
    backgroundColor: '#0F6B57',
  },
  secondary: {
    backgroundColor: '#E7F4EF',
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryLabel: {
    color: '#0F6B57',
  },
});
