'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { FcGoogle } from 'react-icons/fc';
import { createClient } from '@/lib/supabase/client';

export default function SocialAuthButtons({ intent = 'login', onError }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const googleButtonRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [gisRendered, setGisRendered] = useState(false);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // Handle GIS One-Tap / ID Token callback
  const handleGoogleIdToken = useCallback(async ({ credential }) => {
    if (!credential) {
      console.error('[Google Auth]: ID token credential was empty.');
      onError?.('Google oturumu başlatılamadı. E-posta ile devam edebilirsin.');
      return;
    }
    setLoading(true);
    onError?.('');

    try {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credential,
      });

      if (error) {
        console.error('[Google Auth Error]: signInWithIdToken failed', error);
        setLoading(false);
        onError?.('Google ile giriş tamamlanamadı. Lütfen tekrar dene.');
        return;
      }

      const hasField = Boolean(data.user?.user_metadata?.alan_secimi);
      router.replace(intent === 'signup' || !hasField ? '/profilini-tamamla' : '/dashboard');
    } catch (err) {
      console.error('[Google Auth Exception]:', err);
      setLoading(false);
      onError?.('Bir hata oluştu. Lütfen tekrar dene.');
    }
  }, [intent, onError, router, supabase]);

  // Try initializing GIS button when script is available
  const initGisButton = useCallback(() => {
    if (!googleClientId || !googleButtonRef.current || !window.google?.accounts?.id) {
      return;
    }

    try {
      googleButtonRef.current.replaceChildren();
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleIdToken,
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
        width: Math.max(280, Math.floor(googleButtonRef.current.getBoundingClientRect().width || 280)),
      });

      setGisRendered(true);
    } catch (err) {
      console.warn('[Google Auth]: GIS render fallbacked to OAuth button', err);
      setGisRendered(false);
    }
  }, [googleClientId, handleGoogleIdToken, intent]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      const timer = setTimeout(() => {
        initGisButton();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initGisButton]);

  // Standard OAuth Fallback Trigger
  const startStandardGoogleOAuth = async () => {
    setLoading(true);
    onError?.('');

    try {
      const callback = new URL('/auth/callback', window.location.origin);
      const requested = new URLSearchParams(window.location.search).get('next');
      callback.searchParams.set('next',
        intent === 'signup'
          ? '/profilini-tamamla'
          : requested?.startsWith('/dashboard/abonelik') ? requested : '/dashboard'
      );

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: callback.toString() },
      });

      if (error) {
        console.error('[Google OAuth Error]:', error);
        const message = /provider|enabled|unsupported/i.test(error.message)
          ? 'Google ile giriş şu anda kullanılamıyor. E-posta ile devam edebilirsin.'
          : error.message;
        onError?.(message);
        setLoading(false);
      }
    } catch (err) {
      console.error('[Google OAuth Exception]:', err);
      onError?.('Google yönlendirmesi sırasında bir hata oluştu.');
      setLoading(false);
    }
  };

  return (
    <div className="social-auth" aria-label="Google ile devam et">
      {/* Load GIS script asynchronously */}
      {googleClientId && (
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onLoad={initGisButton}
          onError={() => console.warn('[Google Auth]: GIS script failed to load, using OAuth fallback.')}
        />
      )}

      {/* GIS container slot */}
      <div
        ref={googleButtonRef}
        className="google-identity-button"
        style={{ display: gisRendered ? 'block' : 'none' }}
      />

      {/* Standard Google Button (Always visible on first paint & fallback) */}
      {!gisRendered && (
        <button
          className="social-auth-button"
          disabled={loading}
          onClick={startStandardGoogleOAuth}
          type="button"
        >
          <FcGoogle aria-hidden="true" size={20} />
          <span>{loading ? 'Yönlendiriliyor…' : 'Google ile devam et'}</span>
        </button>
      )}
    </div>
  );
}
