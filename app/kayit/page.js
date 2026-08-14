'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Eye, EyeOff, Lock, Mail, UserRound } from 'lucide-react';
import SocialAuthButtons from '@/components/auth/SocialAuthButtons';
import BrandLogo from '@/components/brand/BrandLogo';
import { createClient } from '@/lib/supabase/client';
import { ALANLAR, getExamTabs } from '@/lib/constants/alanlar';
import { PASSWORD_MIN_LENGTH, passwordValidationMessage } from '@/lib/utils/password';

export default function KayitPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '', alanSecimi: '', yksYear: 2027 });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationSent, setConfirmationSent] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (step === 1) {
      if (form.fullName.trim().length < 2) return setError('Ad soyad alanını doldurmalısın.');
      const passwordError = passwordValidationMessage(form.password);
      if (passwordError) return setError(passwordError);
      if (form.password !== form.confirmPassword) return setError('Şifreler birbiriyle eşleşmiyor.');
      if (!form.consent) return setError('Devam etmek için üyelik şartlarını kabul etmelisin.');
      setStep(2);
      return;
    }

    if (!form.alanSecimi) return setError('Devam etmek için bir alan seçmelisin.');
    setLoading(true);
    const callback = new URL('/auth/callback', window.location.origin);
    callback.searchParams.set('next', '/dashboard');
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      options: {
        emailRedirectTo: callback.toString(),
        data: { full_name: form.fullName.trim(), alan_secimi: form.alanSecimi, yks_year: form.yksYear },
      },
    });
    setLoading(false);

    if (signUpError) {
      const message = /already|registered/i.test(signUpError.message)
        ? 'Bu e-posta ile daha önce hesap oluşturulmuş. Giriş yapmayı dene.'
        : /rate limit/i.test(signUpError.message)
          ? 'Çok fazla doğrulama e-postası istendi. Birkaç dakika sonra tekrar dene.'
          : signUpError.message;
      return setError(message);
    }
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setStep(1);
      return setError('Bu e-posta ile daha önce hesap oluşturulmuş. Giriş yapmayı veya şifreni yenilemeyi dene.');
    }
    if (!data.session) {
      setConfirmationSent(true);
      return;
    }
    router.replace('/dashboard');
  };

  if (confirmationSent) {
    return (
      <main className="auth-shell auth-single">
        <section className="auth-card confirmation-card">
          <span className="confirmation-icon"><Mail size={26} /></span>
          <h2>E-postanı kontrol et</h2>
          <p>Hesabını etkinleştirmek için <strong>{form.email}</strong> adresine gönderilen bağlantıya tıkla.</p>
          <Link className="public-button primary" href="/giris">Giriş sayfasına dön</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <section className="auth-side">
        <Link href="/" className="public-brand" aria-label="calisiyo ana sayfa"><BrandLogo priority /></Link>
        <div>
          <span className="public-kicker">İlk adım</span>
          <h1>Çalışma sistemini alanına göre kur.</h1>
          <p>Seçtiğin alan, TYT/AYT/YDT sekmelerini ve görünür dersleri otomatik belirler. Sonradan Ayarlar’dan değiştirebilirsin.</p>
        </div>
        <div className="auth-side-list">
          <span><Check size={18} /> Tüm özellikler dahil</span>
          <span><Check size={18} /> Gerçek verilerle takip</span>
          <span><Check size={18} /> Mobil uyumlu</span>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-card signup-card">
          <Link href="/" className="public-brand auth-mobile-brand" aria-label="calisiyo ana sayfa"><BrandLogo priority /></Link>
          <div className="step-indicator"><span className="is-active">1</span><i /><span className={step === 2 ? 'is-active' : ''}>2</span></div>
          <h2>Hesap oluştur</h2>
          <p>{step === 1 ? 'E-posta veya sosyal hesabınla ücretsiz başla.' : 'Hazırlandığın alanı seç.'}</p>

          {error && <div className="auth-alert" role="alert">{error}</div>}
          {step === 1 && <><SocialAuthButtons intent="signup" onError={setError} /><div className="auth-divider"><span>veya e-posta ile</span></div></>}

          <form onSubmit={submit}>
            {step === 1 ? (
              <>
                <label>Ad Soyad<div><UserRound size={17} /><input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} autoComplete="name" required /></div></label>
                <label>E-posta<div><Mail size={17} /><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="email" required /></div></label>
                <label>Şifre<div><Lock size={17} /><input type={showPassword ? 'text' : 'password'} minLength={PASSWORD_MIN_LENGTH} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete="new-password" required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div><small className="auth-help">En az 10 karakter; büyük/küçük harf, rakam ve özel karakter kullan.</small></label>
                <label>Şifreyi doğrula<div><Lock size={17} /><input type={showPassword ? 'text' : 'password'} minLength={PASSWORD_MIN_LENGTH} value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} autoComplete="new-password" required /></div></label>
                <label className="auth-checkbox-label">
                  <input type="checkbox" checked={form.consent || false} onChange={(e) => setForm({ ...form, consent: e.target.checked })} required />
                  <span>
                    <Link href="/kullanim-sartlari" target="_blank" style={{ color: '#00a870', textDecoration: 'underline' }}>Kullanım Şartları</Link>’nı,{' '}
                    <Link href="/gizlilik" target="_blank" style={{ color: '#00a870', textDecoration: 'underline' }}>Gizlilik Politikası</Link>’nı ve{' '}
                    <Link href="/kvkk" target="_blank" style={{ color: '#00a870', textDecoration: 'underline' }}>KVKK Aydınlatma Metni</Link>’ni okudum, kabul ediyorum.
                  </span>
                </label>
              </>
            ) : (
              <div className="signup-fields">
                <div className="signup-year-choice" role="group" aria-label="YKS yılı">
                  {[2027, 2028].map((year) => <button type="button" key={year} className={form.yksYear === year ? 'is-selected' : ''} onClick={() => setForm({ ...form, yksYear: year })}><span>YKS {year}</span><small>{year === 2028 ? 'Yeni MEB müfredatı' : 'Mevcut müfredat'}</small>{form.yksYear === year && <Check size={17} />}</button>)}
                </div>
                {Object.entries(ALANLAR).map(([key, details]) => (
                  <button type="button" key={key} className={form.alanSecimi === key ? 'is-selected' : ''} onClick={() => setForm({ ...form, alanSecimi: key })}>
                    <span>{details.label}</span><small>{getExamTabs(key).join(' + ')}</small>{form.alanSecimi === key && <Check size={17} />}
                  </button>
                ))}
              </div>
            )}
            <div className="signup-actions">
              {step === 2 && <button type="button" className="public-button" onClick={() => setStep(1)}>Geri</button>}
              <button className="public-button primary auth-submit" disabled={loading}>{loading ? 'Hesap oluşturuluyor…' : step === 1 ? 'Devam Et' : 'Hesabı Oluştur'}</button>
            </div>
          </form>
          <p className="auth-switch">Zaten hesabın var mı? <Link href="/giris">Giriş yap</Link></p>
        </div>
      </section>
    </main>
  );
}
