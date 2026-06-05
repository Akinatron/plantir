import { ReactNode } from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';

import { colors } from '../../design/theme';
import { radius, spacing } from '../../design/spacing';
import { typography } from '../../design/typography';
import { AppText } from './AppText';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
  leftElement?: ReactNode;
  rightElement?: ReactNode;
};

export function TextField({ label, error, hint, leftElement, rightElement, style, ...props }: TextFieldProps) {
  return (
    <View style={styles.container}>
      <AppText variant="eyebrow">{label}</AppText>
      <View style={[styles.inputShell, error && styles.inputShellError, props.editable === false && styles.disabled]}>
        {leftElement ? <View style={styles.sideElement}>{leftElement}</View> : null}
        <TextInput
          {...props}
          accessibilityLabel={props.accessibilityLabel ?? label}
          placeholderTextColor={colors.textSubtle}
          style={[styles.input, style]}
        />
        {rightElement ? <View style={styles.sideElement}>{rightElement}</View> : null}
      </View>
      {error ? (
        <AppText variant="caption" style={styles.error}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption">{hint}</AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[2],
  },
  inputShell: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 50,
  },
  inputShellError: {
    borderColor: colors.danger,
  },
  disabled: {
    backgroundColor: colors.surfaceSoft,
    opacity: 0.78,
  },
  input: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    minHeight: 48,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  sideElement: {
    paddingHorizontal: spacing[3],
  },
  error: {
    color: colors.danger,
  },
});
