'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { BookMarked, CalendarDays, BarChart2, ClipboardList, Timer, BookOpen, TrendingUp, ArrowRight, Sparkles, Shield, Zap } from 'lucide-react';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.3
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function HomePage() {
  return (
    <div className="landing">
      {/* Animated Background Shapes */}
      <div className="bg-shapes">
        <div className="shape shape-1" />
        <div className="shape shape-2" />
        <div className="shape shape-3" />
      </div>

      <header className="landing-header">
        <div className="landing-container">
          <Link href="/" className="landing-logo">
            <div className="logo-icon-wrap">
              <BookMarked size={22} />
            </div>
            <span className="landing-logo-text">calisiyo</span>
          </Link>
          <div className="landing-nav">
            <Link href="/giris" className="landing-nav-link">Giriş Yap</Link>
            <Link href="/kayit" className="landing-nav-cta">Başla <ArrowRight size={16} /></Link>
          </div>
        </div>
      </header>

      <main className="landing-hero">
        <div className="landing-container">
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="hero-badge"
          >
            <Sparkles size={14} /> YKS 2027 Hazırlığın
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
            className="hero-title"
          >
            Çalışma planını <br />
            <span className="hero-highlight">tek yerden</span> yönet.
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
            className="hero-desc"
          >
            Günlük program, deneme analizi, konu takibi, kaynak yönetimi ve daha fazlası.
            Minimal, hızlı ve mobil uyumlu.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.5, delay: 0.3, type: 'spring' }}
            className="hero-actions"
          >
            <Link href="/kayit" className="hero-btn-primary">
              Ücretsiz Başla <ArrowRight size={18} />
            </Link>
            <Link href="/giris" className="hero-btn-secondary">
              Giriş Yap
            </Link>
          </motion.div>

          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="hero-features"
          >
            {[
              { icon: <CalendarDays size={18} />, label: 'Günlük Program' },
              { icon: <BarChart2 size={18} />, label: 'Deneme Analizi' },
              { icon: <ClipboardList size={18} />, label: 'Konu Takibi' },
              { icon: <Timer size={18} />, label: 'Pomodoro' },
              { icon: <BookOpen size={18} />, label: 'Kaynak Yönetimi' },
              { icon: <TrendingUp size={18} />, label: 'İstatistikler' },
            ].map((f, i) => (
              <motion.div key={i} variants={item} className="feature-chip">
                <span className="feature-chip-icon">{f.icon}</span>
                <span>{f.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </main>

      {/* Why Section */}
      <section className="why-section">
        <div className="landing-container">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="why-grid"
          >
            {[
              { icon: <Zap size={24} />, title: 'Hızlı & Kolay', desc: 'En fazla 2-3 tıklama ile istediğin işlemi yap.' },
              { icon: <Shield size={24} />, title: 'Güvenli', desc: 'Verileriniz güvenli bulut altyapısında korunur.' },
              { icon: <Sparkles size={24} />, title: 'Akıllı Planlama', desc: 'Alanına göre otomatik ders filtreleme.' },
            ].map((card, i) => (
              <motion.div 
                key={i} 
                className="why-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 + 0.2 }}
              >
                <div className="why-icon">{card.icon}</div>
                <h3>{card.title}</h3>
                <p>{card.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="footer-inner">
            <div className="footer-brand">
              <BookMarked size={18} className="footer-logo-icon" />
              <span>calisiyo</span>
            </div>
            <p className="footer-copy">© 2027 calisiyo. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .landing {
          min-height: 100vh;
          background: #fafffe;
          overflow: hidden;
          position: relative;
        }

        .bg-shapes {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .shape {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.35;
        }

        .shape-1 {
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, #a7f3d0 0%, transparent 70%);
          top: -200px;
          right: -150px;
        }

        .shape-2 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, #d1fae5 0%, transparent 70%);
          bottom: 100px;
          left: -200px;
        }

        .shape-3 {
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, #6ee7b7 0%, transparent 70%);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.15;
        }

        .landing-container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 24px;
          position: relative;
        }

        /* Header */
        .landing-header {
          padding: 20px 0;
        }

        .landing-header .landing-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .landing-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: inherit;
        }

        .logo-icon-wrap {
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

        .landing-logo-text {
          font-weight: 800;
          font-size: 1.5rem;
          background: linear-gradient(135deg, #059669, #10b981);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.03em;
        }

        .landing-nav {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .landing-nav-link {
          font-size: 0.9375rem;
          font-weight: 500;
          color: #475569;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 12px;
          transition: all 200ms;
        }

        .landing-nav-link:hover {
          background: rgba(16, 185, 129, 0.06);
          color: #059669;
        }

        .landing-nav-cta {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.9375rem;
          font-weight: 600;
          color: white;
          background: linear-gradient(135deg, #10b981, #059669);
          padding: 10px 24px;
          border-radius: 99px;
          text-decoration: none;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
          transition: all 200ms;
        }

        .landing-nav-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }

        /* Hero */
        .landing-hero {
          padding: 80px 0 60px;
          text-align: center;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 20px;
          background: rgba(209, 250, 229, 0.6);
          color: #047857;
          border-radius: 100px;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 28px;
          border: 1px solid rgba(16, 185, 129, 0.15);
          backdrop-filter: blur(8px);
        }

        .hero-title {
          font-size: 4rem;
          font-weight: 800;
          line-height: 1.12;
          color: #0f172a;
          margin-bottom: 24px;
          letter-spacing: -0.03em;
        }

        .hero-highlight {
          background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-desc {
          font-size: 1.1875rem;
          color: #64748b;
          max-width: 520px;
          margin: 0 auto 40px;
          line-height: 1.7;
        }

        .hero-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          margin-bottom: 72px;
        }

        .hero-btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 16px 36px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border-radius: 99px;
          font-weight: 700;
          font-size: 1.0625rem;
          text-decoration: none;
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.35);
          transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        .hero-btn-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 36px rgba(16, 185, 129, 0.4);
        }

        .hero-btn-secondary {
          padding: 16px 36px;
          background: white;
          color: #334155;
          border-radius: 99px;
          font-weight: 600;
          font-size: 1.0625rem;
          text-decoration: none;
          border: 1.5px solid #e2e8f0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.03);
          transition: all 200ms;
        }

        .hero-btn-secondary:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .hero-features {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 12px;
          max-width: 680px;
          margin: 0 auto;
        }

        .feature-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(0,0,0,0.04);
          border-radius: 100px;
          font-size: 0.875rem;
          font-weight: 500;
          color: #475569;
          box-shadow: 0 2px 8px -2px rgba(0, 0, 0, 0.04);
          backdrop-filter: blur(8px);
          transition: all 250ms;
        }

        .feature-chip:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.08);
          border-color: rgba(16, 185, 129, 0.2);
          color: #0f172a;
        }

        .feature-chip-icon {
          color: #10b981;
          display: flex;
        }

        /* Why Section */
        .why-section {
          padding: 60px 0 80px;
        }

        .why-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        .why-card {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(0, 0, 0, 0.04);
          border-radius: 24px;
          padding: 36px 28px;
          text-align: center;
          transition: all 300ms;
        }

        .why-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.08);
          border-color: rgba(16, 185, 129, 0.15);
        }

        .why-icon {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: linear-gradient(135deg, #ecfdf5, #d1fae5);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          color: #059669;
        }

        .why-card h3 {
          font-size: 1.125rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 8px;
        }

        .why-card p {
          font-size: 0.9375rem;
          color: #64748b;
          line-height: 1.6;
        }

        /* Footer */
        .landing-footer {
          padding: 32px 0;
          border-top: 1px solid rgba(0, 0, 0, 0.04);
        }

        .footer-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .footer-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          font-size: 1rem;
          color: #0f172a;
        }

        .footer-logo-icon {
          color: #10b981;
        }

        .footer-copy {
          font-size: 0.8125rem;
          color: #94a3b8;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .hero-title {
            font-size: 2.5rem;
          }

          .hero-desc {
            font-size: 1rem;
          }

          .landing-hero {
            padding: 48px 0 40px;
          }

          .hero-actions {
            flex-direction: column;
            width: 100%;
            max-width: 320px;
            margin: 0 auto 56px;
          }

          .hero-btn-primary,
          .hero-btn-secondary {
            width: 100%;
            justify-content: center;
          }

          .why-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .footer-inner {
            flex-direction: column;
            gap: 12px;
            text-align: center;
          }
        }

        @media (max-width: 480px) {
          .hero-title {
            font-size: 2rem;
          }

          .landing-nav-link {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
