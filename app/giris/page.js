'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { BookMarked, LogIn, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function GirisPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError('E-posta veya şifre hatalı.');
      setLoading(false);
      return;
    }
    router.push('/dashboard');
  }

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
          <h1>Tekrar hoş geldin</h1>
          <p>Hesabına giriş yaparak kaldığın yerden devam et.</p>
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

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-input-group">
            <label className="auth-label">E-posta</label>
            <div className="auth-input-wrap">
              <Mail size={18} className="auth-input-icon" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@email.com"
                required
                className="auth-input"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="auth-input-group">
            <label className="auth-label">Şifre</label>
            <div className="auth-input-wrap">
              <Lock size={18} className="auth-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="auth-input"
                autoComplete="current-password"
              />
              <button 
                type="button" 
                className="auth-eye" 
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? (
              <div className="spinner" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />
            ) : (
              <>Giriş Yap <ArrowRight size={18} /></>
            )}
          </button>
        </form>

        <p className="auth-footer-text">
          Hesabın yok mu?{' '}
          <Link href="/kayit" className="auth-link">Ücretsiz kaydol</Link>
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
          right: -100px;
        }

        .auth-shape-2 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, #d1fae5, transparent 70%);
          bottom: -100px;
          left: -100px;
        }

        .auth-card {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.7);
          border-radius: 28px;
          padding: 44px 40px;
          width: 100%;
          max-width: 440px;
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
          margin-bottom: 36px;
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
          margin-bottom: 32px;
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
          line-height: 1.5;
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
          margin-bottom: 28px;
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

        .auth-eye {
          position: absolute;
          right: 14px;
          color: #94a3b8;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          display: flex;
          border-radius: 8px;
          transition: all 150ms;
        }

        .auth-eye:hover {
          color: #64748b;
          background: #f1f5f9;
        }

        .auth-submit {
          width: 100%;
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
          margin-top: 4px;
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
          transition: color 150ms;
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
        }
      `}</style>
    </div>
  );
}
