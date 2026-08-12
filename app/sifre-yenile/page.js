'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Eye, EyeOff, Lock } from 'lucide-react';
import BrandLogo from '@/components/brand/BrandLogo';
import { createClient } from '@/lib/supabase/client';
import { PASSWORD_MIN_LENGTH, passwordValidationMessage } from '@/lib/utils/password';

export default function SifreYenilePage() {
  const supabase = useMemo(() => createClient(), []);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const passwordError = passwordValidationMessage(password);
    if (passwordError) return setError(passwordError);
    if (password !== confirmPassword) return setError('Şifreler birbiriyle eşleşmiyor.');
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) return setError('Bağlantının süresi dolmuş olabilir. Yeni bir bağlantı iste.');
    setSaved(true);
  };

  return (
    <main className="auth-shell auth-single">
      <section className="auth-card confirmation-card recovery-card">
        <Link href="/" className="public-brand confirmation-brand" aria-label="calisiyo ana sayfa"><BrandLogo priority /></Link>
        <span className="confirmation-icon">{saved ? <CheckCircle2 size={26} /> : <Lock size={26} />}</span>
        <h2>{saved ? 'Şifren güncellendi' : 'Yeni şifre oluştur'}</h2>
        <p>{saved ? 'Yeni şifrenle hesabına güvenle devam edebilirsin.' : 'En az 10 karakter; büyük/küçük harf, rakam ve özel karakter içeren yeni şifreni gir.'}</p>
        {error && <div className="auth-alert" role="alert">{error}</div>}
        {!saved && <form onSubmit={submit}><label>Yeni şifre<div><Lock size={17} /><input type={showPassword ? 'text' : 'password'} minLength={PASSWORD_MIN_LENGTH} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label><label>Yeni şifreyi doğrula<div><Lock size={17} /><input type={showPassword ? 'text' : 'password'} minLength={PASSWORD_MIN_LENGTH} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required /></div></label><button className="public-button primary auth-submit" disabled={loading}>{loading ? 'Kaydediliyor…' : 'Şifreyi Güncelle'}</button></form>}
        {saved && <Link href="/dashboard" className="public-button primary">Panele Git</Link>}
      </section>
    </main>
  );
}
