import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors } from '../../design/theme';
import { spacing } from '../../design/spacing';
import { AppText } from './AppText';

type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = 'Loading...' }: LoadingStateProps) {
  return (
    <View style={styles.container} accessible accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator color={colors.primary} accessibilityLabel={label} />
      <AppText variant="body">{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: spacing[3],
    justifyContent: 'center',
    minHeight: 180,
  },
});
