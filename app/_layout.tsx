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
        <Stack.Screen name="trips/[tripId]/activity" options={{ title: 'Activity' }} />
        <Stack.Screen name="trips/[tripId]/members" options={{ title: 'Members' }} />
        <Stack.Screen name="trips/[tripId]/invite" options={{ title: 'Invite' }} />
        <Stack.Screen name="trips/[tripId]/settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="trips/[tripId]/date-poll/setup" options={{ title: 'Date poll setup' }} />
        <Stack.Screen name="trips/[tripId]/date-poll/vote" options={{ title: 'Date poll' }} />
        <Stack.Screen name="trips/[tripId]/date-poll/results" options={{ title: 'Date results' }} />
        <Stack.Screen name="trips/[tripId]/destination/setup" options={{ title: 'Destination setup' }} />
        <Stack.Screen name="trips/[tripId]/destination/index" options={{ title: 'Proposals' }} />
        <Stack.Screen name="trips/[tripId]/destination/create" options={{ title: 'Create proposal' }} />
        <Stack.Screen name="trips/[tripId]/destination/[proposalId]" options={{ title: 'Proposal' }} />
        <Stack.Screen name="trips/[tripId]/destination/results" options={{ title: 'Destination results' }} />
        <Stack.Screen name="trips/[tripId]/expenses/index" options={{ title: 'Expenses' }} />
        <Stack.Screen name="trips/[tripId]/expenses/create" options={{ title: 'Create expense' }} />
        <Stack.Screen name="trips/[tripId]/expenses/[expenseId]" options={{ title: 'Expense' }} />
        <Stack.Screen name="trips/[tripId]/expenses/balances" options={{ title: 'Balances' }} />
        <Stack.Screen name="trips/[tripId]/expenses/settlements" options={{ title: 'Settlements' }} />
        <Stack.Screen name="trips/[tripId]/plan/index" options={{ title: 'Plan' }} />
        <Stack.Screen name="trips/[tripId]/plan/tasks/index" options={{ title: 'Tasks' }} />
        <Stack.Screen name="trips/[tripId]/plan/tasks/create" options={{ title: 'Create task' }} />
        <Stack.Screen name="trips/[tripId]/plan/notes" options={{ title: 'Notes' }} />
        <Stack.Screen name="trips/[tripId]/plan/packing" options={{ title: 'Packing' }} />
        <Stack.Screen name="trips/[tripId]/plan/files" options={{ title: 'Files' }} />
        <Stack.Screen name="invite/[token]" options={{ title: 'Invitation' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </AppProviders>
  );
}
