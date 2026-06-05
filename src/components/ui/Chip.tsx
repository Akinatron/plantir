import { ReactNode } from 'react';
import { Pressable, PressableProps, StyleSheet, View } from 'react-native';

import { colors } from '../../design/theme';
import { radius, spacing } from '../../design/spacing';
import { typography } from '../../design/typography';
import { AppText } from './AppText';

type ChipTone = 'neutral' | 'sea' | 'coral' | 'sun' | 'sky';

type ChipProps = PressableProps & {
  label: string;
  tone?: ChipTone;
  selected?: boolean;
  icon?: ReactNode;
};

export function Chip({ label, tone = 'neutral', selected = false, icon, style, ...props }: ChipProps) {
  const content = (
    <View style={styles.content}>
      {icon}
      <AppText style={[styles.label, selected && styles.selectedLabel]}>{label}</AppText>
    </View>
  );

  if (props.onPress) {
    return (
      <Pressable
        {...props}
        accessibilityRole="button"
        accessibilityLabel={props.accessibilityLabel ?? label}
        accessibilityState={{ selected }}
        hitSlop={props.hitSlop ?? 6}
        style={({ pressed }) => [
          styles.base,
          styles[tone],
          selected && styles.selected,
          pressed && styles.pressed,
          typeof style === 'function' ? style({ pressed }) : style,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.base, styles[tone], selected && styles.selected, typeof style === 'function' ? undefined : style]}>{content}</View>;
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    borderWidth: 1,
    minHeight: 32,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[1],
  },
  neutral: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  sea: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primarySoft,
  },
  coral: {
    backgroundColor: colors.coralSoft,
    borderColor: colors.coralSoft,
  },
  sun: {
    backgroundColor: colors.sunSoft,
    borderColor: colors.sunSoft,
  },
  sky: {
    backgroundColor: colors.skySoft,
    borderColor: colors.skySoft,
  },
  selected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.78,
  },
  label: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  selectedLabel: {
    color: colors.primaryText,
  },
});
