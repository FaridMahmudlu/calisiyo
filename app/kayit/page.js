'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BadgePercent, Check, Eye, EyeOff, Lock, Mail, UserRound } from 'lucide-react';
import SocialAuthButtons from '@/components/auth/SocialAuthButtons';
import BrandLogo from '@/components/brand/BrandLogo';
import { createClient } from '@/lib/supabase/client';
import { ALANLAR, getExamTabs } from '@/lib/constants/alanlar';
import { PASSWORD_MIN_LENGTH, passwordValidationMessage } from '@/lib/utils/password';

export default function KayitPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '', alanSecimi: '', yksYear: 2027, creatorCode: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [creatorClaim, setCreatorClaim] = useState(null);
  const [creatorCodeState, setCreatorCodeState] = useState('idle');
  const creatorValidationId = useRef(0);
  const creatorValidationReason = useRef(null);

  const validateCreatorCode = async () => {
    const code = form.creatorCode.trim();
    if (!code) {
      creatorValidationReason.current = null;
      setCreatorClaim(null);
      setCreatorCodeState('idle');
      return null;
    }
    if (creatorCodeState === 'valid') return true;
    const validationId = ++creatorValidationId.current;
    creatorValidationReason.current = null;
    setCreatorCodeState('checking');
    try {
      const response = await fetch('/api/auth/content-producer-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const result = await response.json();
      if (validationId !== creatorValidationId.current) return null;
      if (response.status === 429 && result.retryable) {
        creatorValidationReason.current = 'limited';
        setCreatorClaim(null);
        setCreatorCodeState('limited');
        setError(result.message || 'Kod doğrulama hizmeti kısa süreliğine yoğun. Bir dakika sonra tekrar dene.');
        return null;
      }
      if (!response.ok || !result.valid) {
        creatorValidationReason.current = 'invalid';
        setCreatorClaim(null);
        setCreatorCodeState('invalid');
        return null;
      }
      setForm((current) => ({ ...current, creatorCode: result.code }));
      creatorValidationReason.current = null;
      setCreatorCodeState('valid');
      return true;
    } catch {
      if (validationId !== creatorValidationId.current) return null;
      creatorValidationReason.current = 'invalid';
      setCreatorClaim(null);
      setCreatorCodeState('invalid');
      return null;
    }
  };

  const issueCreatorClaim = async () => {
    const code = form.creatorCode.trim();
    if (!code) return null;
    if (creatorClaim && creatorCodeState === 'valid') return creatorClaim;

    const validationId = ++creatorValidationId.current;
    creatorValidationReason.current = null;
    setCreatorCodeState('checking');
    try {
      const response = await fetch('/api/auth/content-producer-code/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const result = await response.json();
      if (validationId !== creatorValidationId.current) return null;
      if (response.status === 429 && result.retryable) {
        creatorValidationReason.current = 'limited';
        setCreatorCodeState('limited');
        setError(result.message || 'Kod doğrulama hizmeti kısa süreliğine yoğun. Bir dakika sonra tekrar dene.');
        return null;
      }
      if (!response.ok || !result.valid || !result.claimToken) {
        creatorValidationReason.current = 'invalid';
        setCreatorCodeState('invalid');
        return null;
      }
      setForm((current) => ({ ...current, creatorCode: result.code }));
      setCreatorClaim(result.claimToken);
      setCreatorCodeState('valid');
      return result.claimToken;
    } catch {
      if (validationId !== creatorValidationId.current) return null;
      creatorValidationReason.current = 'invalid';
      setCreatorCodeState('invalid');
      return null;
    }
  };

  const creatorClaimForOAuth = async () => {
    const claim = await issueCreatorClaim();
    if (form.creatorCode.trim() && !claim) {
      if (creatorValidationReason.current !== 'limited') setError('Bu kod geçerli değil veya şu anda kullanılamıyor.');
      throw new Error('creator_code_invalid');
    }
    return claim;
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (step === 1) {
      if (form.fullName.trim().length < 2) return setError('Ad soyad alanını doldurmalısın.');
      const passwordError = passwordValidationMessage(form.password);
      if (passwordError) return setError(passwordError);
      if (form.password !== form.confirmPassword) return setError('Şifreler birbiriyle eşleşmiyor.');
      if (!form.consent) return setError('Devam etmek için üyelik şartlarını kabul etmelisin.');
      const validCode = await validateCreatorCode();
      if (form.creatorCode.trim() && !validCode) {
        if (creatorValidationReason.current !== 'limited') setError('Bu kod geçerli değil veya şu anda kullanılamıyor.');
        return;
      }
      setStep(2);
      return;
    }

    if (!form.alanSecimi) return setError('Devam etmek için bir alan seçmelisin.');
    setLoading(true);
    const signupClaim = await issueCreatorClaim();
    if (form.creatorCode.trim() && !signupClaim) {
      setLoading(false);
      setStep(1);
      if (creatorValidationReason.current !== 'limited') setError('Bu kod geçerli değil veya şu anda kullanılamıyor.');
      return;
    }
    const callback = new URL('/auth/callback', window.location.origin);
    callback.searchParams.set('next', '/dashboard');
    if (signupClaim) callback.searchParams.set('creator_claim', signupClaim);
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
    if (signupClaim) {
      try {
        const claimResponse = await fetch('/api/auth/content-producer-code/claim', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ claimToken: signupClaim }),
        });
        if (!claimResponse.ok) {
          router.replace('/auth/kod-hatasi?next=/dashboard');
          return;
        }
      } catch {
        router.replace('/auth/kod-hatasi?next=/dashboard');
        return;
      }
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
          {step === 1 && <><SocialAuthButtons intent="signup" onError={setError} beforeOAuth={creatorClaimForOAuth} /><div className="auth-divider"><span>veya e-posta ile</span></div></>}

          <form onSubmit={submit}>
            {step === 1 ? (
              <>
                <label>Ad Soyad<div><UserRound size={17} /><input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} autoComplete="name" required /></div></label>
                <label>E-posta<div><Mail size={17} /><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="email" required /></div></label>
                <label>Şifre<div><Lock size={17} /><input type={showPassword ? 'text' : 'password'} minLength={PASSWORD_MIN_LENGTH} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete="new-password" required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div><small className="auth-help">En az 10 karakter; büyük/küçük harf, rakam ve özel karakter kullan.</small></label>
                <label>Şifreyi doğrula<div><Lock size={17} /><input type={showPassword ? 'text' : 'password'} minLength={PASSWORD_MIN_LENGTH} value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} autoComplete="new-password" required /></div></label>
                <label htmlFor="creator-code">İçerik üretici kodun var mı? <small>(İsteğe bağlı)</small><div><BadgePercent size={17} /><input id="creator-code" value={form.creatorCode} onChange={(event) => { creatorValidationId.current += 1; creatorValidationReason.current = null; setForm({ ...form, creatorCode: event.target.value.toUpperCase() }); setCreatorClaim(null); setCreatorCodeState('idle'); }} onBlur={validateCreatorCode} autoComplete="off" spellCheck={false} inputMode="text" placeholder="Örn. MELIKE20" maxLength={64} aria-describedby="creator-code-help creator-code-status" /></div><small id="creator-code-help" className="auth-help">Varsa içerik üreticisinin sana özel kodunu girebilirsin. İsteğe bağlıdır.</small>{creatorCodeState !== 'idle' && <small id="creator-code-status" className={`auth-help creator-code-status is-${creatorCodeState}`} role={creatorCodeState === 'invalid' || creatorCodeState === 'limited' ? 'alert' : 'status'}>{creatorCodeState === 'checking' ? 'Kod kontrol ediliyor…' : creatorCodeState === 'valid' ? '✓ Kod doğrulandı. %20 içerik üretici indirimin hesabına tanımlanacak.' : creatorCodeState === 'limited' ? 'Kod doğrulama hizmeti kısa süreliğine yoğun. Bir dakika sonra tekrar dene.' : 'Bu kod geçerli değil veya şu anda kullanılamıyor.'}</small>}</label>
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
