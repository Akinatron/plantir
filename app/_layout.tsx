/**
 * Root layout de Expo Router.
 *
 * Providers globales: SafeArea, GestureHandler, QueryClient, SessionListener.
 */

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '../global.css';
import { supabase } from '@/lib/supabase/client';
import { sessionStore } from '@/stores/session.store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default function RootLayout() {
  // Listener de sesión: sincroniza Supabase Auth con el store local.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      sessionStore.getState().setSession(session);
    });
    // Carga inicial
    supabase.auth.getSession().then(({ data }) => {
      sessionStore.getState().setSession(data.session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="invite/[token]" options={{ headerShown: true }} />
            <Stack.Screen name="trips/create" options={{ presentation: 'modal' }} />
            <Stack.Screen name="trips/[tripId]/index" />
            <Stack.Screen
              name="trips/[tripId]/date-poll/vote"
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen
              name="trips/[tripId]/destination/proposals/create"
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen
              name="trips/[tripId]/expenses/create"
              options={{ presentation: 'modal' }}
            />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
