'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { FcGoogle } from 'react-icons/fc';
import { createClient } from '@/lib/supabase/client';

const PROVIDERS = [{ id: 'google', label: 'Google ile devam et', icon: FcGoogle }];

export default function SocialAuthButtons({ intent = 'login', onError }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const googleButtonRef = useRef(null);
  const [loadingProvider, setLoadingProvider] = useState('');
  const [googleScriptReady, setGoogleScriptReady] = useState(false);
  const [googleIdentityEnabled, setGoogleIdentityEnabled] = useState(false);
  const [providerState, setProviderState] = useState({ loading: true, google: false });
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    const timer = setTimeout(() => {
      setGoogleIdentityEnabled(Boolean(googleClientId) && !['localhost', '127.0.0.1'].includes(window.location.hostname));
    }, 0);
    return () => clearTimeout(timer);
  }, [googleClientId]);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/providers', { cache: 'no-store' })
      .then((response) => response.json())
      .then(({ providers }) => {
        if (active) setProviderState({ loading: false, google: Boolean(providers?.google) });
      })
      .catch(() => {
        if (active) setProviderState({ loading: false, google: false });
      });
    return () => { active = false; };
  }, []);

  const finishGoogleIdentity = useCallback(async ({ credential }) => {
    if (!credential) {
      onError?.('Google oturumu başlatılamadı. E-posta ile devam edebilirsin.');
      return;
    }
    setLoadingProvider('google');
    onError?.('');
    const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: credential });
    if (error) {
      setLoadingProvider('');
      onError?.('Google ile giriş tamamlanamadı. Lütfen tekrar dene.');
      return;
    }
    const hasField = Boolean(data.user?.user_metadata?.alan_secimi);
    router.replace(intent === 'signup' || !hasField ? '/profilini-tamamla' : '/dashboard');
  }, [intent, onError, router, supabase]);

  useEffect(() => {
    if (!googleIdentityEnabled || !googleScriptReady || !providerState.google || !googleButtonRef.current || !window.google?.accounts?.id) return;
    googleButtonRef.current.replaceChildren();
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: finishGoogleIdentity,
      context: intent === 'signup' ? 'signup' : 'signin',
      itp_support: true,
      use_fedcm_for_prompt: true,
    });
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: Math.max(260, Math.floor(googleButtonRef.current.getBoundingClientRect().width)),
    });
  }, [finishGoogleIdentity, googleClientId, googleIdentityEnabled, googleScriptReady, intent, providerState.google]);

  const startOAuth = async (provider) => {
    if (!providerState[provider]) {
      onError?.('Google ile giriş hazırlanıyor. Şimdilik e-posta ile hemen devam edebilirsin.');
      return;
    }
    setLoadingProvider(provider);
    onError?.('');

    const callback = new URL('/auth/callback', window.location.origin);
    callback.searchParams.set(
      'next',
      intent === 'signup' ? '/profilini-tamamla' : '/dashboard'
    );

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callback.toString() },
    });

    if (error) {
      const message = /provider|enabled|unsupported/i.test(error.message)
        ? 'Google ile giriş şu anda kullanılamıyor. E-posta ile devam edebilirsin.'
        : error.message;
      onError?.(message);
      setLoadingProvider('');
    }
  };

  return (
    <div className="social-auth" aria-label="Sosyal hesap ile devam et">
      {googleIdentityEnabled && <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={() => setGoogleScriptReady(true)} />}
      {googleIdentityEnabled && providerState.google ? (
        <div className={`google-identity-button ${loadingProvider ? 'is-loading' : ''}`} ref={googleButtonRef} aria-label="Google ile devam et" />
      ) : PROVIDERS.map(({ id, label, icon: Icon }) => (
        <button
          className="social-auth-button"
          disabled={providerState.loading || Boolean(loadingProvider)}
          key={id}
          onClick={() => startOAuth(id)}
          type="button"
        >
          <Icon aria-hidden="true" size={20} />
          <span>{loadingProvider === id ? 'Yönlendiriliyor…' : label}</span>
          {!providerState.loading && !providerState[id] && <small>Yakında</small>}
        </button>
      ))}
      {!providerState.loading && !providerState.google && (
        <p className="social-auth-note">E-posta ile hesap oluşturma ve giriş kullanıma hazır.</p>
      )}
    </div>
  );
}
