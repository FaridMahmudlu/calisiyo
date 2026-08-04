'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';
import BrandLogo from '@/components/brand/BrandLogo';
import { createClient } from '@/lib/supabase/client';

export default function SifremiUnuttumPage() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    const callback = new URL('/auth/callback', window.location.origin);
    callback.searchParams.set('next', '/sifre-yenile');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: callback.toString() }
    );
    setLoading(false);
    if (resetError) return setError(resetError.message);
    setSent(true);
  };

  return (
    <main className="auth-shell auth-single">
      <section className="auth-card confirmation-card recovery-card">
        <Link href="/" className="public-brand confirmation-brand" aria-label="calisiyo ana sayfa"><BrandLogo priority /></Link>
        <span className="confirmation-icon"><Mail size={26} /></span>
        <h2>{sent ? 'E-postanı kontrol et' : 'Şifreni yenile'}</h2>
        <p>{sent ? `${email} adresine güvenli şifre yenileme bağlantısı gönderdik.` : 'Hesabına bağlı e-posta adresini gir; sana güvenli bir yenileme bağlantısı gönderelim.'}</p>
        {error && <div className="auth-alert" role="alert">{error}</div>}
        {!sent && <form onSubmit={submit}><label>E-posta<div><Mail size={17} /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div></label><button className="public-button primary auth-submit" disabled={loading}>{loading ? 'Gönderiliyor…' : 'Bağlantıyı Gönder'}</button></form>}
        <Link href="/giris" className="auth-back-link"><ArrowLeft size={15} /> Giriş sayfasına dön</Link>
      </section>
    </main>
  );
}
