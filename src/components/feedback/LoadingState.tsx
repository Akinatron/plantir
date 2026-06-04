import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '../ui/AppText';

type LoadingStateProps = {
  label: string;
};

export function LoadingState({ label }: LoadingStateProps) {
  return (
    <View style={styles.container} accessible accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator color="#0F6B57" accessibilityLabel={label} />
      <AppText>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
  },
});
