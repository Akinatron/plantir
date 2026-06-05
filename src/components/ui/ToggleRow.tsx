import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { colors } from '../../design/theme';
import { radius, spacing } from '../../design/spacing';
import { AppText } from './AppText';

type ToggleRowProps = {
  label: string;
  description?: string;
  value: boolean;
  disabled?: boolean;
  onValueChange?: (value: boolean) => void;
  onToggle?: () => void;
};

export function ToggleRow({ label, description, value, disabled = false, onValueChange, onToggle }: ToggleRowProps) {
  const toggle = () => {
    if (disabled) {
      return;
    }

    if (onValueChange) {
      onValueChange(!value);
      return;
    }

    onToggle?.();
  };

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={toggle}
      style={({ pressed }) => [styles.row, disabled && styles.disabled, pressed && !disabled && styles.pressed]}
    >
      <View style={styles.copy}>
        <AppText variant="bodyStrong">{label}</AppText>
        {description ? <AppText variant="caption">{description}</AppText> : null}
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onValueChange ?? (() => onToggle?.())}
        trackColor={{ false: colors.borderStrong, true: colors.primarySoft }}
        thumbColor={value ? colors.primary : colors.surface}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[4],
    justifyContent: 'space-between',
    minHeight: 64,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  copy: {
    flex: 1,
    gap: spacing[1],
  },
  disabled: {
    opacity: 0.62,
  },
  pressed: {
    opacity: 0.82,
  },
});
