import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '../src/components/ui/Button';
import { Screen } from '../src/components/ui/Screen';
import { AppText } from '../src/components/ui/AppText';

export default function WelcomeScreen() {
  return (
    <Screen>
      <View style={styles.content}>
        <View style={styles.copy}>
          <AppText variant="eyebrow">Plantir</AppText>
          <AppText variant="title">Plan the trip without losing the plot.</AppText>
          <AppText variant="body">
            Create the group, find the best date, choose the place, and split expenses in one
            guided flow.
          </AppText>
        </View>

        <View style={styles.actions}>
          <Link href="/login" asChild>
            <Button label="Log in" />
          </Link>
          <Link href="/(tabs)/trips" asChild>
            <Button label="Open app shell" variant="secondary" />
          </Link>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 32,
  },
  copy: {
    gap: 16,
  },
  actions: {
    gap: 12,
  },
});
