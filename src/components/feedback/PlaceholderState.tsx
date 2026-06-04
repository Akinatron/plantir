import { StyleSheet, View } from 'react-native';

import { AppText } from '../ui/AppText';

type PlaceholderStateProps = {
  title: string;
  description: string;
};

export function PlaceholderState({ title, description }: PlaceholderStateProps) {
  return (
    <View style={styles.container} accessible accessibilityLabel={`${title}. ${description}`}>
      <AppText variant="subtitle" style={styles.centered}>
        {title}
      </AppText>
      <AppText variant="body" style={styles.centered}>
        {description}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    minHeight: 160,
    paddingVertical: 24,
  },
  centered: {
    textAlign: 'center',
  },
});
