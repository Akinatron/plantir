import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PlaceholderState } from '../src/components/feedback/PlaceholderState';
import { Button } from '../src/components/ui/Button';
import { Screen } from '../src/components/ui/Screen';

export default function LoginScreen() {
  return (
    <Screen>
      <View style={styles.content}>
        <PlaceholderState
          title="Login placeholder"
          description="Auth screens will be implemented after Supabase Auth and profiles are wired."
        />
        <Link href="/(tabs)/trips" asChild>
          <Button label="Continue to app shell" />
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 24,
  },
});
