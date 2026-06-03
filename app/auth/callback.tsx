import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { InlineNotice } from '../../src/components/feedback/InlineNotice';
import { LoadingState } from '../../src/components/feedback/LoadingState';
import { Screen } from '../../src/components/ui/Screen';
import { exchangeCodeForSession } from '../../src/services/authService';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function handleCallback() {
      try {
        if (params.code) {
          await exchangeCodeForSession(params.code);
        }

        if (isMounted) {
          router.replace('/(tabs)/trips');
        }
      } catch (unknownError) {
        if (isMounted) {
          setError(unknownError instanceof Error ? unknownError.message : 'Unable to finish login.');
        }
      }
    }

    handleCallback();

    return () => {
      isMounted = false;
    };
  }, [params.code, router]);

  return (
    <Screen>
      {error ? (
        <InlineNotice title="Auth callback failed" message={error} tone="error" />
      ) : (
        <LoadingState label="Finishing login..." />
      )}
    </Screen>
  );
}
