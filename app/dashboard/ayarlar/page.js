'use client';

import { useState } from 'react';
import { useUser } from '../layout';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Settings, User, Lock, LogOut, CheckCircle, AlertCircle } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function AyarlarPage() {
  const { profile, setProfile } = useUser();
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    alan_secimi: profile?.alan_secimi || 'sayisal',
  });
  const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' });

  async function handleProfileUpdate(e) {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: form.full_name, alan_secimi: form.alan_secimi, updated_at: new Date().toISOString() })
      .eq('id', profile.id);

    if (!error) {
      setProfile({ ...profile, full_name: form.full_name, alan_secimi: form.alan_secimi });
      setMessage({ text: 'Profil başarıyla güncellendi.', type: 'success' });
    } else {
      setMessage({ text: 'Profil güncellenirken bir hata oluştu.', type: 'error' });
    }
    setLoading(false);
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (passwordForm.password !== passwordForm.confirm) {
      setMessage({ text: 'Şifreler eşleşmiyor.', type: 'error' });
      return;
    }
    if (passwordForm.password.length < 6) {
      setMessage({ text: 'Şifre en az 6 karakter olmalıdır.', type: 'error' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: passwordForm.password });
    if (!error) {
      setMessage({ text: 'Şifre başarıyla güncellendi.', type: 'success' });
      setPasswordForm({ password: '', confirm: '' });
    } else {
      setMessage({ text: 'Şifre güncellenirken bir hata oluştu.', type: 'error' });
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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="page"
      style={{ maxWidth: '640px', margin: '0 auto' }}
    >
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings size={24} color="var(--primary-500)" />
          Ayarlar
        </h1>
      </div>

      {message.text && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}
        >
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </motion.div>
      )}

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
      >
        {/* Profile */}
        <motion.div variants={itemVariants} className="card settings-card">
          <h3 className="settings-title">
            <User size={20} color="var(--primary-500)" /> Profil Bilgileri
          </h3>
          <form onSubmit={handleProfileUpdate} className="settings-form">
            <div className="input-group">
              <label className="input-label">Ad Soyad</label>
              <input 
                className="input" 
                value={form.full_name} 
                onChange={(e) => setForm({ ...form, full_name: e.target.value })} 
                placeholder="Adınız Soyadınız"
              />
            </div>
            <div className="input-group">
              <label className="input-label">Alan Seçimi</label>
              <select 
                className="select" 
                value={form.alan_secimi} 
                onChange={(e) => setForm({ ...form, alan_secimi: e.target.value })}
              >
                {alanOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <button className="btn btn-primary settings-btn" type="submit" disabled={loading}>
              {loading ? <span className="spinner spinner-sm"></span> : 'Bilgileri Güncelle'}
            </button>
          </form>
        </motion.div>

        {/* Password */}
        <motion.div variants={itemVariants} className="card settings-card">
          <h3 className="settings-title">
            <Lock size={20} color="var(--primary-500)" /> Şifre Değiştir
          </h3>
          <form onSubmit={handlePasswordChange} className="settings-form">
            <div className="input-group">
              <label className="input-label">Yeni Şifre</label>
              <input 
                className="input" 
                type="password" 
                value={passwordForm.password} 
                onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })} 
                placeholder="En az 6 karakter" 
              />
            </div>
            <div className="input-group">
              <label className="input-label">Şifre Tekrar</label>
              <input 
                className="input" 
                type="password" 
                value={passwordForm.confirm} 
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} 
                placeholder="Şifrenizi tekrar girin" 
              />
            </div>
            <button className="btn btn-primary settings-btn" type="submit" disabled={loading}>
              {loading ? <span className="spinner spinner-sm"></span> : 'Şifreyi Değiştir'}
            </button>
          </form>
        </motion.div>

        {/* Logout */}
        <motion.div variants={itemVariants} className="card settings-card" style={{ border: '1px solid var(--error-light)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Hesaptan Çıkış</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Mevcut oturumunuzu güvenle sonlandırın.</p>
            </div>
            <button className="btn btn-danger" onClick={handleLogout} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <LogOut size={16} /> Çıkış Yap
            </button>
          </div>
        </motion.div>
      </motion.div>

      <style jsx>{`
        .alert {
          padding: 14px 16px;
          border-radius: var(--radius-md);
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.875rem;
          font-weight: 500;
        }
        
        .alert-success {
          background: var(--success-light);
          color: var(--primary-700);
          border: 1px solid var(--primary-300);
        }
        
        .alert-error {
          background: var(--error-light);
          color: var(--error);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .settings-card {
          padding: 24px;
        }

        .settings-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding-bottom: 16px;
          border-bottom: 1px dashed var(--border-light);
        }

        .settings-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .settings-btn {
          align-self: flex-start;
          margin-top: 8px;
        }

        @media (max-width: 480px) {
          .settings-card {
            padding: 20px;
          }
          
          .settings-btn {
            align-self: stretch;
            width: 100%;
          }
        }
      `}</style>
    </motion.div>
  );
}
