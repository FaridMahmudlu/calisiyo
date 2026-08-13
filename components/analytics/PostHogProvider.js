'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';

export default function PostHogProvider({ children, enabled = false }) {
  useEffect(() => {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

    if (enabled && posthogKey && typeof window !== 'undefined') {
      if (!posthog.__loaded) {
        posthog.init(posthogKey, {
          api_host: posthogHost,
          person_profiles: 'identified_only',
          capture_pageview: true,
          capture_pageleave: true,
        });
      }
      posthog.opt_in_capturing();
    } else if (!enabled && typeof window !== 'undefined' && posthog.__loaded) {
      posthog.opt_out_capturing();
    }
  }, [enabled]);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
