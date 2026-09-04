'use client';

import { useMemo, useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { createClient } from '@/lib/supabase/client';

export default function SocialAuthButtons({ intent = 'login', onError, beforeOAuth }) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(false);

  const startGoogleOAuth = async () => {
    setLoading(true);
    onError?.('');

    try {
      const creatorClaim = intent === 'signup' && beforeOAuth
        ? await beforeOAuth()
        : null;
      const callback = new URL('/auth/callback', window.location.origin);
      const requested = new URLSearchParams(window.location.search).get('next');
      callback.searchParams.set('next',
        intent === 'signup'
          ? '/profilini-tamamla'
          : requested?.startsWith('/dashboard/abonelik') ? requested : '/dashboard'
      );
      if (creatorClaim) callback.searchParams.set('creator_claim', creatorClaim);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callback.toString(),
          queryParams: { hl: 'tr' },
        },
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
      if (err?.message !== 'creator_code_invalid') {
        onError?.('Google yönlendirmesi sırasında bir hata oluştu.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="social-auth" aria-label="Google ile devam et">
      <button
        className="social-auth-button"
        disabled={loading}
        onClick={startGoogleOAuth}
        type="button"
      >
        <span className="social-auth-button-icon" aria-hidden="true">
          <FcGoogle size={21} />
        </span>
        <span className="social-auth-button-label">{loading ? 'Google’a yönlendiriliyor…' : 'Google ile devam et'}</span>
      </button>
    </div>
  );
}
