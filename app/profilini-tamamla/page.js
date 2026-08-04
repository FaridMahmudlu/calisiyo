'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookMarked, Check, UserRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ALANLAR, getExamTabs } from '@/lib/constants/alanlar';

export default function ProfiliniTamamlaPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [form, setForm] = useState({ fullName: '', alanSecimi: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active) return;
      if (!user) {
        router.replace('/giris');
        return;
      }
      setForm({
        fullName: user.user_metadata?.full_name || user.user_metadata?.name || '',
        alanSecimi: user.user_metadata?.alan_secimi || '',
      });
      setLoading(false);
    });
    return () => { active = false; };
  }, [router, supabase]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (form.fullName.trim().length < 2) return setError('Ad soyad alanını doldurmalısın.');
    if (!form.alanSecimi) return setError('Devam etmek için bir alan seçmelisin.');
    setLoading(true);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setError('Oturum bulunamadı. Lütfen tekrar giriş yap.');
      setLoading(false);
      return;
    }

    const profile = { full_name: form.fullName.trim(), alan_secimi: form.alanSecimi };
    const [{ error: profileError }, { error: metadataError }] = await Promise.all([
      supabase.from('profiles').upsert({ id: user.id, ...profile }, { onConflict: 'id' }),
      supabase.auth.updateUser({ data: profile }),
    ]);

    if (profileError || metadataError) {
      setError(profileError?.message || metadataError?.message || 'Profil kaydedilemedi.');
      setLoading(false);
      return;
    }

    router.replace('/dashboard');
  };

  return (
    <main className="auth-shell auth-single">
      <section className="auth-card confirmation-card profile-completion-card">
        <span className="confirmation-logo"><BookMarked size={22} /></span>
        <h2>Profilini tamamla</h2>
        <p>Sana doğru dersleri gösterebilmemiz için son iki bilgiyi seç.</p>
        {error && <div className="auth-alert" role="alert">{error}</div>}
        <form onSubmit={submit}>
          <label>Ad Soyad<div><UserRound size={17} /><input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} autoComplete="name" required /></div></label>
          <div className="signup-fields profile-fields">
            {Object.entries(ALANLAR).map(([key, details]) => (
              <button type="button" key={key} className={form.alanSecimi === key ? 'is-selected' : ''} onClick={() => setForm({ ...form, alanSecimi: key })}>
                <span>{details.label}</span><small>{getExamTabs(key).join(' + ')}</small>{form.alanSecimi === key && <Check size={17} />}
              </button>
            ))}
          </div>
          <button className="public-button primary auth-submit" disabled={loading}>{loading ? 'Hazırlanıyor…' : 'Çalışmaya Başla'}</button>
        </form>
      </section>
    </main>
  );
}
