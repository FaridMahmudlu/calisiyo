'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Cookie, ShieldCheck } from 'lucide-react';
import PostHogProvider from './PostHogProvider';

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
  return (
    <PostHogProvider enabled={analyticsEnabled}>
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
    </PostHogProvider>
  );
}
