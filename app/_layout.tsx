import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppProviders } from '../src/providers/AppProviders';

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="dark" />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'Log in' }} />
        <Stack.Screen name="signup" options={{ title: 'Sign up' }} />
        <Stack.Screen name="trips/create" options={{ title: 'Create trip' }} />
        <Stack.Screen name="trips/[tripId]/index" options={{ title: 'Trip' }} />
        <Stack.Screen name="trips/[tripId]/members" options={{ title: 'Members' }} />
        <Stack.Screen name="trips/[tripId]/invite" options={{ title: 'Invite' }} />
        <Stack.Screen name="trips/[tripId]/settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="trips/[tripId]/date-poll/setup" options={{ title: 'Date poll setup' }} />
        <Stack.Screen name="trips/[tripId]/date-poll/vote" options={{ title: 'Date poll' }} />
        <Stack.Screen name="trips/[tripId]/date-poll/results" options={{ title: 'Date results' }} />
        <Stack.Screen name="invite/[token]" options={{ title: 'Invitation' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </AppProviders>
  );
}
