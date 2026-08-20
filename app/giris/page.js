'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock3, Eye, EyeOff, Lock, Mail, Target } from 'lucide-react';
import SocialAuthButtons from '@/components/auth/SocialAuthButtons';
import BrandLogo from '@/components/brand/BrandLogo';
import { createClient } from '@/lib/supabase/client';

export default function GirisPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: form.email.trim().toLowerCase(),
      password: form.password,
    });

    if (signInError) {
      setError('E-posta veya şifre hatalı. Bilgilerini kontrol edip tekrar dene.');
      setLoading(false);
      return;
    }

    const requested = new URLSearchParams(window.location.search).get('next');
    router.replace(requested?.startsWith('/dashboard/abonelik') ? requested : '/dashboard');
  };

  return (
    <main className="auth-shell">
      <section className="auth-side">
        <Link href="/" className="public-brand" aria-label="calisiyo ana sayfa"><BrandLogo priority /></Link>
        <div>
          <span className="public-kicker">YKS Çalışma Koçu</span>
          <h1>Planın kaldığın yerden devam ediyor.</h1>
          <p>Programına, denemelerine, tekrarlarına ve tüm çalışma verilerine tek yerden ulaş.</p>
        </div>
        <div className="auth-side-list">
          <span><Clock3 size={18} /> Günlük planın</span>
          <span><Clock3 size={18} /> Kronometre kayıtların</span>
          <span><Target size={18} /> Gerçek ilerleme verilerin</span>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-card">
          <Link href="/" className="public-brand auth-mobile-brand" aria-label="calisiyo ana sayfa"><BrandLogo priority /></Link>
          <h2>Tekrar hoş geldin</h2>
          <p>Hesabına giriş yaparak kaldığın yerden devam et.</p>

          {error && <div className="auth-alert" role="alert">{error}</div>}
          <SocialAuthButtons intent="login" onError={setError} />
          <div className="auth-divider"><span>veya e-posta ile</span></div>

          <form onSubmit={submit}>
            <label>
              E-posta
              <div><Mail size={17} /><input type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="ornek@email.com" required /></div>
            </label>
            <label>
              <span className="auth-label-row">Şifre <Link href="/sifremi-unuttum">Şifremi unuttum</Link></span>
              <div><Lock size={17} /><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="En az 8 karakter" required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
            </label>
            <button className="public-button primary auth-submit" disabled={loading}>{loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}</button>
          </form>
          <p className="auth-switch">Hesabın yok mu? <Link href="/kayit">Ücretsiz hesap oluştur</Link></p>
        </div>
      </section>
    </main>
  );
}
