import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    // Client replay is intentionally disabled. Product analytics is loaded only
    // after consent, while Sentry remains limited to necessary error diagnostics.
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.user) event.user = undefined;
      if (event.request) {
        event.request.cookies = undefined;
        event.request.headers = undefined;
        event.request.data = undefined;
      }
      return event;
    },
    debug: false,
  });
}
