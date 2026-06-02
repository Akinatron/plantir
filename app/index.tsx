/**
 * Pantalla raíz: redirige según el estado de sesión.
 */

import { Redirect } from 'expo-router';
import { useSession } from '@/stores/session.store';

export default function Index() {
  const session = useSession();
  if (!session.isHydrated) return null;
  if (!session.user) return <Redirect href="/welcome" />;
  return <Redirect href="/(tabs)/trips" />;
}
