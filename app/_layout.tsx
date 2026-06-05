import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Sentry } from '../src/lib/observability/sentry';
import { AppProviders } from '../src/providers/AppProviders';

function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="dark" />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'Log in' }} />
        <Stack.Screen name="signup" options={{ title: 'Sign up' }} />
        <Stack.Screen name="trips/create" options={{ title: 'Create trip' }} />
        <Stack.Screen name="trips/[tripId]" options={{ headerShown: false }} />
        <Stack.Screen name="invite/[token]" options={{ title: 'Invitation' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </AppProviders>
  );
}

export default Sentry.wrap(RootLayout);
