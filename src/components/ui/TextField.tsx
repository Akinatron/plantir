import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';

import { AppText } from './AppText';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function TextField({ label, error, style, ...props }: TextFieldProps) {
  return (
    <View style={styles.container}>
      <AppText variant="eyebrow">{label}</AppText>
      <TextInput
        {...props}
        placeholderTextColor="#98A2B3"
        style={[styles.input, error && styles.inputError, style]}
      />
      {error ? <AppText style={styles.error}>{error}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D0D5DD',
    borderRadius: 8,
    borderWidth: 1,
    color: '#101828',
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inputError: {
    borderColor: '#B42318',
  },
  error: {
    color: '#B42318',
    fontSize: 13,
    lineHeight: 18,
  },
});
