'use client';

import { useState } from 'react';
import { useUser } from '../layout';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function AyarlarPage() {
  const { profile, setProfile } = useUser();
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    alan_secimi: profile?.alan_secimi || 'sayisal',
  });
  const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' });

  async function handleProfileUpdate(e) {
    e.preventDefault();
    setLoading(true);
    setSuccess('');

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: form.full_name, alan_secimi: form.alan_secimi, updated_at: new Date().toISOString() })
      .eq('id', profile.id);

    if (!error) {
      setProfile({ ...profile, full_name: form.full_name, alan_secimi: form.alan_secimi });
      setSuccess('Profil güncellendi!');
    }
    setLoading(false);
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (passwordForm.password !== passwordForm.confirm) {
      setSuccess('Şifreler eşleşmiyor!');
      return;
    }
    if (passwordForm.password.length < 6) {
      setSuccess('Şifre en az 6 karakter olmalıdır.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: passwordForm.password });
    if (!error) {
      setSuccess('Şifre güncellendi!');
      setPasswordForm({ password: '', confirm: '' });
    }
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/giris');
    router.refresh();
  }

  const alanOptions = [
    { value: 'sayisal', label: 'Sayısal' },
    { value: 'esit_agirlik', label: 'Eşit Ağırlık' },
    { value: 'sozel', label: 'Sözel' },
    { value: 'dil', label: 'Dil' },
  ];

  return (
    <div className="page animate-fade-in" style={{ maxWidth: '560px' }}>
      {success && (
        <div className="card" style={{ padding: '12px 16px', marginBottom: '20px', background: 'var(--success-light)', color: 'var(--primary-700)', fontSize: '0.875rem', borderColor: 'var(--primary-300)' }}>
          {success}
        </div>
      )}

      {/* Profile */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '20px' }}>👤 Profil Düzenle</h3>
        <form onSubmit={handleProfileUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="input-group">
            <label className="input-label">Ad Soyad</label>
            <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="input-group">
            <label className="input-label">Alan Seçimi</label>
            <select className="select" value={form.alan_secimi} onChange={(e) => setForm({ ...form, alan_secimi: e.target.value })}>
              {alanOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? <span className="spinner"></span> : 'Güncelle'}
          </button>
        </form>
      </div>

      {/* Password */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '20px' }}>🔒 Şifre Değiştir</h3>
        <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="input-group">
            <label className="input-label">Yeni Şifre</label>
            <input className="input" type="password" value={passwordForm.password} onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })} placeholder="En az 6 karakter" />
          </div>
          <div className="input-group">
            <label className="input-label">Şifre Tekrar</label>
            <input className="input" type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} placeholder="Tekrar girin" />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? <span className="spinner"></span> : 'Şifreyi Değiştir'}
          </button>
        </form>
      </div>

      {/* Logout */}
      <div className="card">
        <button className="btn btn-danger" style={{ width: '100%' }} onClick={handleLogout}>
          🚪 Çıkış Yap
        </button>
      </div>
    </div>
  );
}
