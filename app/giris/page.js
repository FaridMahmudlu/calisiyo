'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function GirisPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const router = useRouter();
  const supabase = createClient();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Lütfen tüm alanları doldurun.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (signInError) {
      setError('E-posta veya şifre hatalı.');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="auth-container">
      <div className="auth-card animate-slide-up">
        <div className="auth-header">
          <div className="auth-logo">📖</div>
          <h1 className="auth-title">calisiyo</h1>
          <p className="auth-subtitle">Hesabına giriş yap</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="auth-form">
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
                placeholder="Şifrenizi girin"
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%', marginTop: '8px' }}
          >
            {loading ? <span className="spinner"></span> : 'Giriş Yap'}
          </button>
        </form>

        <p className="auth-footer">
          Hesabın yok mu? <Link href="/kayit" className="auth-link">Kayıt Ol</Link>
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
          max-width: 440px;
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

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 20px;
        }

        .auth-error {
          padding: 12px 16px;
          background: var(--error-light);
          color: #991B1B;
          border-radius: var(--radius-md);
          font-size: 0.8125rem;
          margin-bottom: 16px;
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
      `}</style>
    </div>
  );
}
