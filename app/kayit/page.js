'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function KayitPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    alanSecimi: '',
  });

  const router = useRouter();
  const supabase = createClient();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleAlanSelect = (alan) => {
    setForm({ ...form, alanSecimi: alan });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 1) {
      if (!form.fullName || !form.email || !form.password) {
        setError('Lütfen tüm alanları doldurun.');
        return;
      }
      if (form.password.length < 6) {
        setError('Şifre en az 6 karakter olmalıdır.');
        return;
      }
      setStep(2);
      return;
    }

    if (!form.alanSecimi) {
      setError('Lütfen bir alan seçin.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          alan_secimi: form.alanSecimi,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  };

  const alanlar = [
    { key: 'sayisal', label: 'Sayısal', icon: '🔢', desc: 'Matematik, Fizik, Kimya, Biyoloji' },
    { key: 'esit_agirlik', label: 'Eşit Ağırlık', icon: '⚖️', desc: 'Matematik, Edebiyat, Tarih, Coğrafya' },
    { key: 'sozel', label: 'Sözel', icon: '📚', desc: 'Edebiyat, Tarih, Coğrafya, Felsefe' },
    { key: 'dil', label: 'Dil', icon: '🌍', desc: 'İngilizce, Almanca, Fransızca' },
  ];

  return (
    <div className="auth-container">
      <div className="auth-card animate-slide-up">
        <div className="auth-header">
          <div className="auth-logo">📖</div>
          <h1 className="auth-title">calisiyo</h1>
          <p className="auth-subtitle">YKS Çalışma Koçun</p>
        </div>

        <div className="auth-steps">
          <div className={`auth-step ${step >= 1 ? 'auth-step-active' : ''}`}>
            <div className="auth-step-dot">1</div>
            <span>Bilgiler</span>
          </div>
          <div className="auth-step-line"></div>
          <div className={`auth-step ${step >= 2 ? 'auth-step-active' : ''}`}>
            <div className="auth-step-dot">2</div>
            <span>Alan Seçimi</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div className="auth-form animate-fade-in">
              <div className="input-group">
                <label className="input-label" htmlFor="fullName">Ad Soyad</label>
                <input
                  id="fullName"
                  className="input"
                  type="text"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Adınızı ve soyadınızı girin"
                  autoComplete="name"
                />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="email">E-posta</label>
                <input
                  id="email"
                  className="input"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="ornek@mail.com"
                  autoComplete="email"
                />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="password">Şifre</label>
                <input
                  id="password"
                  className="input"
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="En az 6 karakter"
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="auth-form animate-fade-in">
              <p className="auth-alan-title">Hangi alanda hazırlanıyorsun?</p>
              <div className="alan-grid">
                {alanlar.map((alan) => (
                  <button
                    type="button"
                    key={alan.key}
                    className={`alan-card ${form.alanSecimi === alan.key ? 'alan-card-selected' : ''}`}
                    onClick={() => handleAlanSelect(alan.key)}
                  >
                    <span className="alan-icon">{alan.icon}</span>
                    <span className="alan-label">{alan.label}</span>
                    <span className="alan-desc">{alan.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}

          <div className="auth-actions">
            {step === 2 && (
              <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                ← Geri
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? (
                <span className="spinner"></span>
              ) : step === 1 ? (
                'Devam Et →'
              ) : (
                'Hesap Oluştur'
              )}
            </button>
          </div>
        </form>

        <p className="auth-footer">
          Zaten hesabın var mı? <Link href="/giris" className="auth-link">Giriş Yap</Link>
        </p>
      </div>

      <style jsx>{`
        .auth-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: linear-gradient(135deg, var(--primary-50) 0%, #FFFFFF 50%, var(--primary-50) 100%);
        }

        .auth-card {
          width: 100%;
          max-width: 480px;
          background: var(--bg-primary);
          border-radius: var(--radius-2xl);
          padding: 40px;
          box-shadow: var(--shadow-xl);
          border: 1px solid var(--border-light);
        }

        .auth-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .auth-logo {
          font-size: 3rem;
          margin-bottom: 8px;
        }

        .auth-title {
          font-size: 1.75rem;
          font-weight: 800;
          background: linear-gradient(135deg, var(--primary-600), var(--primary-400));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .auth-subtitle {
          font-size: 0.875rem;
          color: var(--text-tertiary);
          margin-top: 4px;
        }

        .auth-steps {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 32px;
        }

        .auth-step {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8125rem;
          color: var(--text-tertiary);
          transition: color var(--transition-fast);
        }

        .auth-step-active {
          color: var(--primary-600);
        }

        .auth-step-dot {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
          background: var(--gray-100);
          color: var(--text-tertiary);
          transition: all var(--transition-fast);
        }

        .auth-step-active .auth-step-dot {
          background: var(--primary-500);
          color: white;
        }

        .auth-step-line {
          width: 40px;
          height: 2px;
          background: var(--gray-200);
          border-radius: 1px;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 20px;
        }

        .auth-alan-title {
          font-size: 1rem;
          font-weight: 600;
          text-align: center;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .alan-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .alan-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 20px 12px;
          border-radius: var(--radius-lg);
          border: 2px solid var(--border-light);
          background: var(--bg-primary);
          cursor: pointer;
          transition: all var(--transition-fast);
          text-align: center;
        }

        .alan-card:hover {
          border-color: var(--primary-300);
          background: var(--primary-50);
        }

        .alan-card-selected {
          border-color: var(--primary-500);
          background: var(--primary-50);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
        }

        .alan-icon {
          font-size: 1.75rem;
        }

        .alan-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .alan-desc {
          font-size: 0.7rem;
          color: var(--text-tertiary);
          line-height: 1.3;
        }

        .auth-error {
          padding: 12px 16px;
          background: var(--error-light);
          color: #991B1B;
          border-radius: var(--radius-md);
          font-size: 0.8125rem;
          margin-bottom: 16px;
        }

        .auth-actions {
          display: flex;
          gap: 12px;
        }

        .auth-footer {
          text-align: center;
          font-size: 0.8125rem;
          color: var(--text-tertiary);
          margin-top: 24px;
        }

        .auth-link {
          color: var(--primary-600);
          font-weight: 500;
        }

        .auth-link:hover {
          text-decoration: underline;
        }

        @media (max-width: 480px) {
          .auth-card {
            padding: 28px 20px;
          }

          .alan-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
