'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Cookie, ShieldCheck } from 'lucide-react';

const STORAGE_KEY = 'calisiyo-cookie-consent-v1';

export default function AnalyticsConsentProvider({ children, gaId }) {
  const [consent, setConsent] = useState('loading');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      setConsent(saved === 'accepted' || saved === 'rejected' ? saved : 'unset');
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const openPreferences = () => {
      window.localStorage.removeItem(STORAGE_KEY);
      setConsent('unset');
    };
    window.addEventListener('calisiyo:open-cookie-preferences', openPreferences);
    return () => window.removeEventListener('calisiyo:open-cookie-preferences', openPreferences);
  }, []);

  const choose = (value) => {
    window.localStorage.setItem(STORAGE_KEY, value);
    setConsent(value);
  };

  const analyticsEnabled = consent === 'accepted';

  useEffect(() => {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!posthogKey || typeof window === 'undefined') return undefined;

    if (!analyticsEnabled) {
      window.__calisiyoPosthog?.opt_out_capturing?.();
      return undefined;
    }

    let cancelled = false;
    import('posthog-js').then(({ default: posthog }) => {
      if (cancelled) return;
      if (!posthog.__loaded) {
        posthog.init(posthogKey, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
          person_profiles: 'identified_only',
          capture_pageview: true,
          capture_pageleave: true,
        });
      }
      posthog.opt_in_capturing();
      window.__calisiyoPosthog = posthog;
    });

    return () => { cancelled = true; };
  }, [analyticsEnabled]);

  return (
    <>
      {children}
      {analyticsEnabled && gaId && <GoogleAnalytics gaId={gaId} />}
      {consent === 'unset' && (
        <aside className="cookie-consent" role="dialog" aria-label="Çerez tercihleri" aria-live="polite">
          <span className="cookie-consent-icon"><Cookie /></span>
          <div>
            <strong>Tercih senin</strong>
            <p>Zorunlu oturum çerezleri hesabını çalıştırır. İzin verirsen yalnızca ürünü iyileştirmek için analitik kullanırız. <Link href="/cerez-politikasi">Ayrıntıları oku</Link></p>
          </div>
          <div className="cookie-actions">
            <button onClick={() => choose('rejected')}><ShieldCheck /> Yalnızca zorunlu</button>
            <button className="is-primary" onClick={() => choose('accepted')}>Analitiğe izin ver</button>
          </div>
        </aside>
      )}
    </>
  );
}
