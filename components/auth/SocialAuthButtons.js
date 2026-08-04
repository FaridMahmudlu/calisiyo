'use client';

import { useMemo, useState } from 'react';
import { FaApple } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { createClient } from '@/lib/supabase/client';

const PROVIDERS = [
  { id: 'google', label: 'Google ile devam et', icon: FcGoogle },
  { id: 'apple', label: 'Apple ile devam et', icon: FaApple },
];

export default function SocialAuthButtons({ intent = 'login', onError }) {
  const supabase = useMemo(() => createClient(), []);
  const [loadingProvider, setLoadingProvider] = useState('');

  const startOAuth = async (provider) => {
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
      const providerName = provider === 'google' ? 'Google' : 'Apple';
      const message = /provider|enabled|unsupported/i.test(error.message)
        ? `${providerName} ile giriş şu anda kullanılamıyor. E-posta ile devam edebilirsin.`
        : error.message;
      onError?.(message);
      setLoadingProvider('');
    }
  };

  return (
    <div className="social-auth" aria-label="Sosyal hesap ile devam et">
      {PROVIDERS.map(({ id, label, icon: Icon }) => (
        <button
          className="social-auth-button"
          disabled={Boolean(loadingProvider)}
          key={id}
          onClick={() => startOAuth(id)}
          type="button"
        >
          <Icon aria-hidden="true" size={20} />
          <span>{loadingProvider === id ? 'Yönlendiriliyor…' : label}</span>
        </button>
      ))}
    </div>
  );
}
