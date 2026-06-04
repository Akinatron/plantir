import * as Sentry from '@sentry/react-native';

import { env } from '../../config/env';

const sentryDsn = env.EXPO_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: sentryDsn,
  enabled: Boolean(sentryDsn),
  environment: env.EXPO_PUBLIC_APP_ENV ?? 'development',
  tracesSampleRate: env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
  sendDefaultPii: false,
  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers.Authorization;
      delete event.request.headers.authorization;
      delete event.request.headers.apikey;
    }

    return event;
  },
});

export { Sentry };
