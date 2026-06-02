/**
 * Layout del grupo de auth: solo accesible sin sesión.
 */

import { Stack, Redirect } from 'expo-router';
import { useSession } from '@/stores/session.store';

export default function AuthLayout() {
  const session = useSession();
  if (session.isHydrated && session.user) {
    return <Redirect href="/(tabs)/trips" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
