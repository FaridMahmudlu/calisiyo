import * as Sentry from '@sentry/react-native';
import Storage from 'expo-sqlite/kv-store';
import PostHog from 'posthog-react-native';
import { useSyncExternalStore } from 'react';
import { env } from './env';

// Mirrors the web privacy model: Sentry only receives PII-free error
// diagnostics; product analytics (PostHog) runs only after explicit consent.
export type AnalyticsConsent = 'accepted' | 'rejected' | 'unset';
const CONSENT_KEY = 'calisiyo-analytics-consent-v1';

if (env.sentryDsn) {
  Sentry.init({
    dsn: env.sentryDsn,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    enableAutoSessionTracking: true,
    attachScreenshot: false,
    attachViewHierarchy: false,
    beforeSend(event) {
      event.user = undefined;
      if (event.request) { event.request.cookies = undefined; event.request.headers = undefined; event.request.data = undefined; }
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'http' || breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
        if (breadcrumb.data?.url) breadcrumb.data.url = String(breadcrumb.data.url).split('?')[0];
      }
      return breadcrumb;
    },
  });
}

export const wrapRoot = (component: React.ComponentType) => (env.sentryDsn ? Sentry.wrap(component) : component);
export const reportError = (error: unknown) => { if (env.sentryDsn) Sentry.captureException(error); };

let consent: AnalyticsConsent = (() => {
  const saved = Storage.getItemSync(CONSENT_KEY);
  return saved === 'accepted' || saved === 'rejected' ? saved : 'unset';
})();
const listeners = new Set<() => void>();
let client: PostHog | null = null;

function analyticsClient() {
  if (!env.posthogKey || consent !== 'accepted') return null;
  client ??= new PostHog(env.posthogKey, { host: env.posthogHost, personProfiles: 'identified_only', captureAppLifecycleEvents: true });
  return client;
}

export function setAnalyticsConsent(value: Exclude<AnalyticsConsent, 'unset'>) {
  consent = value;
  Storage.setItemSync(CONSENT_KEY, value);
  if (value === 'accepted') analyticsClient()?.optIn();
  else client?.optOut();
  listeners.forEach((listener) => listener());
}

export function useAnalyticsConsent() {
  return useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener); }, () => consent);
}

export const analyticsAvailable = Boolean(env.posthogKey);

export function trackScreen(name: string) { analyticsClient()?.screen(name); }
export function track(event: string, properties?: Record<string, string | number | boolean | null>) { analyticsClient()?.capture(event, properties); }
export function identifyUser(userId: string | null) {
  const ph = analyticsClient();
  if (!ph) return;
  if (userId) ph.identify(userId); else ph.reset();
}
