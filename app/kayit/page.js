'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { BookMarked, User, Mail, Lock, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';

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
    <div className="auth-page">
      <div className="auth-bg-shapes">
        <div className="auth-shape auth-shape-1" />
        <div className="auth-shape auth-shape-2" />
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring', stiffness: 200, damping: 20 }}
        className="auth-card"
      >
        <Link href="/" className="auth-logo">
          <div className="auth-logo-icon">
            <BookMarked size={22} />
          </div>
          <span className="auth-logo-text">calisiyo</span>
        </Link>

        <div className="auth-header">
          <h1>Hesap oluştur</h1>
          <p>YKS hazırlığını bir üst seviyeye taşı.</p>
        </div>

        {/* Step Indicator */}
        <div className="steps-row">
          <div className={`step-item ${step >= 1 ? 'step-active' : ''}`}>
            <div className="step-dot">{step > 1 ? <CheckCircle2 size={16} /> : '1'}</div>
            <span>Bilgiler</span>
          </div>
          <div className="step-line" />
          <div className={`step-item ${step >= 2 ? 'step-active' : ''}`}>
            <div className="step-dot">2</div>
            <span>Alan Seçimi</span>
          </div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="auth-error"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="auth-form"
              >
                <div className="auth-input-group">
                  <label className="auth-label">Ad Soyad</label>
                  <div className="auth-input-wrap">
                    <User size={18} className="auth-input-icon" />
                    <input
                      className="auth-input"
                      type="text"
                      name="fullName"
                      value={form.fullName}
                      onChange={handleChange}
                      placeholder="Adınızı ve soyadınızı girin"
                      autoComplete="name"
                    />
                  </div>
                </div>
                <div className="auth-input-group">
                  <label className="auth-label">E-posta</label>
                  <div className="auth-input-wrap">
                    <Mail size={18} className="auth-input-icon" />
                    <input
                      className="auth-input"
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="ornek@mail.com"
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div className="auth-input-group">
                  <label className="auth-label">Şifre</label>
                  <div className="auth-input-wrap">
                    <Lock size={18} className="auth-input-icon" />
                    <input
                      className="auth-input"
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="En az 6 karakter"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="auth-form"
              >
                <p className="alan-title">Hangi alanda hazırlanıyorsun?</p>
                <div className="alan-grid">
                  {alanlar.map((alan) => (
                    <button
                      type="button"
                      key={alan.key}
                      className={`alan-card ${form.alanSecimi === alan.key ? 'alan-selected' : ''}`}
                      onClick={() => handleAlanSelect(alan.key)}
                    >
                      <span className="alan-icon">{alan.icon}</span>
                      <span className="alan-label">{alan.label}</span>
                      <span className="alan-desc">{alan.desc}</span>
                      {form.alanSecimi === alan.key && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="alan-check"
                        >
                          <CheckCircle2 size={18} />
                        </motion.div>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="auth-actions">
            {step === 2 && (
              <button type="button" className="auth-back" onClick={() => setStep(1)}>
                <ArrowLeft size={18} /> Geri
              </button>
            )}
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? (
                <div className="spinner" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />
              ) : step === 1 ? (
                <>Devam Et <ArrowRight size={18} /></>
              ) : (
                <>Hesap Oluştur <ArrowRight size={18} /></>
              )}
            </button>
          </div>
        </form>

        <p className="auth-footer-text">
          Zaten hesabın var mı?{' '}
          <Link href="/giris" className="auth-link">Giriş Yap</Link>
        </p>
      </motion.div>

      <style jsx>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: #fafffe;
          position: relative;
          overflow: hidden;
        }

        .auth-bg-shapes {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .auth-shape {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.3;
        }

        .auth-shape-1 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, #a7f3d0, transparent 70%);
          top: -200px;
          left: -100px;
        }

        .auth-shape-2 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, #d1fae5, transparent 70%);
          bottom: -100px;
          right: -100px;
        }

        .auth-card {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.7);
          border-radius: 28px;
          padding: 44px 40px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 20px 60px -15px rgba(0, 0, 0, 0.08);
          position: relative;
          z-index: 1;
        }

        .auth-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: inherit;
          margin-bottom: 32px;
          justify-content: center;
        }

        .auth-logo-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: linear-gradient(135deg, #10b981, #059669);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .auth-logo-text {
          font-weight: 800;
          font-size: 1.375rem;
          background: linear-gradient(135deg, #059669, #10b981);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.02em;
        }

        .auth-header {
          text-align: center;
          margin-bottom: 28px;
        }

        .auth-header h1 {
          font-size: 1.75rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 8px;
          letter-spacing: -0.02em;
        }

        .auth-header p {
          font-size: 0.9375rem;
          color: #64748b;
        }

        .steps-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 28px;
        }

        .step-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8125rem;
          font-weight: 500;
          color: #94a3b8;
          transition: all 200ms;
        }

        .step-active {
          color: #059669;
        }

        .step-dot {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          background: #f1f5f9;
          color: #94a3b8;
          transition: all 250ms;
        }

        .step-active .step-dot {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          box-shadow: 0 3px 10px rgba(16, 185, 129, 0.25);
        }

        .step-line {
          width: 40px;
          height: 2px;
          background: #e2e8f0;
          border-radius: 1px;
        }

        .auth-error {
          background: #fef2f2;
          color: #dc2626;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 20px;
          border: 1px solid rgba(239, 68, 68, 0.1);
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 24px;
        }

        .auth-input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .auth-label {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #334155;
        }

        .auth-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .auth-input-icon {
          position: absolute;
          left: 16px;
          color: #94a3b8;
          pointer-events: none;
        }

        .auth-input {
          width: 100%;
          padding: 13px 16px 13px 48px;
          border: 1.5px solid #e2e8f0;
          border-radius: 14px;
          font-size: 0.9375rem;
          color: #0f172a;
          background: #ffffff;
          outline: none;
          transition: all 200ms;
        }

        .auth-input::placeholder {
          color: #cbd5e1;
        }

        .auth-input:hover {
          border-color: #cbd5e1;
        }

        .auth-input:focus {
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        .alan-title {
          font-size: 1rem;
          font-weight: 600;
          text-align: center;
          color: #0f172a;
          margin-bottom: 4px;
        }

        .alan-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .alan-card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 24px 12px;
          border-radius: 18px;
          border: 2px solid #f1f5f9;
          background: white;
          cursor: pointer;
          transition: all 200ms;
          text-align: center;
        }

        .alan-card:hover {
          border-color: #a7f3d0;
          background: #fafffe;
        }

        .alan-selected {
          border-color: #10b981;
          background: #ecfdf5;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12);
        }

        .alan-check {
          position: absolute;
          top: 10px;
          right: 10px;
          color: #10b981;
        }

        .alan-icon {
          font-size: 1.75rem;
        }

        .alan-label {
          font-size: 0.875rem;
          font-weight: 700;
          color: #0f172a;
        }

        .alan-desc {
          font-size: 0.7rem;
          color: #94a3b8;
          line-height: 1.3;
        }

        .auth-actions {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }

        .auth-back {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 14px 20px;
          background: white;
          color: #475569;
          border: 1.5px solid #e2e8f0;
          border-radius: 14px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 200ms;
        }

        .auth-back:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .auth-submit {
          flex: 1;
          padding: 14px 24px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
          border-radius: 14px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.25);
          transition: all 250ms;
        }

        .auth-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.35);
        }

        .auth-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .auth-footer-text {
          text-align: center;
          font-size: 0.875rem;
          color: #64748b;
        }

        .auth-link {
          color: #059669;
          font-weight: 600;
          text-decoration: none;
        }

        .auth-link:hover {
          color: #047857;
        }

        @media (max-width: 480px) {
          .auth-card {
            padding: 32px 24px;
            border-radius: 24px;
          }

          .auth-header h1 {
            font-size: 1.5rem;
          }

          .alan-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
