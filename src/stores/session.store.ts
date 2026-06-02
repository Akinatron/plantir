/**
 * Store de sesión (Zustand).
 *
 * Mantiene el estado de autenticación del usuario actual. El cliente
 * Supabase es la fuente de verdad para tokens (SecureStore); este store
 * solo cachea el `user` y la `session` para que la UI los consuma sincrónicamente.
 */

import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';

interface SessionState {
  user: User | null;
  session: Session | null;
  isHydrated: boolean;
  setSession: (session: Session | null) => void;
  setHydrated: (hydrated: boolean) => void;
  clear: () => void;
}

export const sessionStore = create<SessionState>((set) => ({
  user: null,
  session: null,
  isHydrated: false,
  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      isHydrated: true,
    }),
  setHydrated: (hydrated) => set({ isHydrated: hydrated }),
  clear: () => set({ user: null, session: null }),
}));

export const useSession = () => sessionStore();
