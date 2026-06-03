import { Session, User } from '@supabase/supabase-js';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { hasRequiredSupabaseEnv } from '../../config/env';
import { getSupabaseClient } from '../../lib/supabase/client';
import { ensureProfile } from '../../services/profileService';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isConfigured: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const hasSupabaseConfig = hasRequiredSupabaseEnv();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(hasSupabaseConfig);
  const [error, setError] = useState<string | null>(
    hasSupabaseConfig
      ? null
      : 'Missing Supabase config. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
  );

  useEffect(() => {
    if (!hasSupabaseConfig) {
      return undefined;
    }

    let isMounted = true;

    try {
      const supabase = getSupabaseClient();

      supabase.auth
        .getSession()
        .then(async ({ data, error: sessionError }) => {
          if (!isMounted) {
            return;
          }

          if (sessionError) {
            setError(sessionError.message);
          }

          setSession(data.session);
          await ensureProfileForSession(data.session);
        })
        .catch((unknownError: unknown) => {
          if (isMounted) {
            setError(getErrorMessage(unknownError));
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession);
        ensureProfileForSession(nextSession).catch((unknownError: unknown) => {
          setError(getErrorMessage(unknownError));
        });
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    } catch (unknownError) {
      queueMicrotask(() => {
        if (isMounted) {
          setError(getErrorMessage(unknownError));
          setIsLoading(false);
        }
      });
      return undefined;
    }
  }, [hasSupabaseConfig]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      error,
      isConfigured: hasSupabaseConfig,
    }),
    [error, hasSupabaseConfig, isLoading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}

async function ensureProfileForSession(session: Session | null): Promise<void> {
  if (!session) {
    return;
  }

  await ensureProfile({
    id: session.user.id,
    email: session.user.email,
    displayName: getDisplayNameFromMetadata(session.user.user_metadata),
  });
}

function getDisplayNameFromMetadata(metadata: User['user_metadata']): string | undefined {
  const displayName = metadata?.display_name;
  return typeof displayName === 'string' && displayName.trim().length > 0 ? displayName : undefined;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unexpected auth error.';
}
