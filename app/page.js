'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { BookMarked, CalendarDays, BarChart2, ClipboardList, Timer, BookOpen, TrendingUp, ArrowRight } from 'lucide-react';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
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
      <header className="landing-header">
        <div className="landing-container">
          <Link href="/" className="landing-logo">
            <BookMarked size={28} className="logo-svg" />
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
            🎯 YKS 2027 Hazırlığın
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
            <motion.div variants={item} className="feature-item glass">
              <CalendarDays size={18} className="feature-icon" />
              <span>Günlük Program</span>
            </motion.div>
            <motion.div variants={item} className="feature-item glass">
              <BarChart2 size={18} className="feature-icon" />
              <span>Deneme Analizi</span>
            </motion.div>
            <motion.div variants={item} className="feature-item glass">
              <ClipboardList size={18} className="feature-icon" />
              <span>Konu Takibi</span>
            </motion.div>
            <motion.div variants={item} className="feature-item glass">
              <Timer size={18} className="feature-icon" />
              <span>Pomodoro</span>
            </motion.div>
            <motion.div variants={item} className="feature-item glass">
              <BookOpen size={18} className="feature-icon" />
              <span>Kaynak Yönetimi</span>
            </motion.div>
            <motion.div variants={item} className="feature-item glass">
              <TrendingUp size={18} className="feature-icon" />
              <span>İstatistikler</span>
            </motion.div>
          </motion.div>
        </div>
      </main>

      <style jsx>{`
        .landing {
          min-height: 100vh;
          background: linear-gradient(180deg, #ecfdf5 0%, #ffffff 50%, #ffffff 100%);
          overflow: hidden;
        }

        .landing-container {
          max-width: 1080px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .landing-header {
          padding: 24px 0;
        }

        .landing-header .landing-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .landing-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: inherit;
        }
        
        .logo-svg {
          color: #10B981;
        }

        .landing-logo-text {
          font-weight: 800;
          font-size: 1.5rem;
          background: linear-gradient(135deg, #059669, #34D399);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.03em;
        }

        .landing-nav {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .landing-nav-link {
          font-size: 0.9375rem;
          font-weight: 500;
          color: #4B5563;
          text-decoration: none;
          padding: 8px 16px;
          border-radius: 12px;
          transition: all 200ms;
        }

        .landing-nav-link:hover {
          background: rgba(0,0,0,0.03);
          color: #111827;
        }

        .landing-nav-cta {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.9375rem;
          font-weight: 600;
          color: white;
          background: linear-gradient(135deg, #10B981, #059669);
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

        .landing-hero {
          padding: 100px 0 120px;
          text-align: center;
        }

        .hero-badge {
          display: inline-block;
          padding: 8px 20px;
          background: rgba(209, 250, 229, 0.8);
          color: #047857;
          border-radius: 100px;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 24px;
          border: 1px solid rgba(16, 185, 129, 0.2);
          backdrop-filter: blur(8px);
        }

        .hero-title {
          font-size: 4rem;
          font-weight: 800;
          line-height: 1.15;
          color: #111827;
          margin-bottom: 24px;
          letter-spacing: -0.03em;
        }

        .hero-highlight {
          background: linear-gradient(135deg, #10B981, #059669);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-desc {
          font-size: 1.25rem;
          color: #6B7280;
          max-width: 560px;
          margin: 0 auto 40px;
          line-height: 1.7;
        }

        .hero-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-bottom: 80px;
        }

        .hero-btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 16px 36px;
          background: linear-gradient(135deg, #10B981, #059669);
          color: white;
          border-radius: 99px;
          font-weight: 600;
          font-size: 1.0625rem;
          text-decoration: none;
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.35);
          transition: all 300ms;
        }

        .hero-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(16, 185, 129, 0.45);
        }

        .hero-btn-secondary {
          padding: 16px 36px;
          background: white;
          color: #374151;
          border-radius: 99px;
          font-weight: 600;
          font-size: 1.0625rem;
          text-decoration: none;
          border: 1px solid #E5E7EB;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
          transition: all 200ms;
        }

        .hero-btn-secondary:hover {
          border-color: #D1D5DB;
          background: #F9FAFB;
          box-shadow: 0 4px 12px rgba(0,0,0,0.04);
        }

        .hero-features {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 16px;
          max-width: 640px;
          margin: 0 auto;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(0,0,0,0.04);
          border-radius: 16px;
          font-size: 0.875rem;
          font-weight: 500;
          color: #4B5563;
          box-shadow: 0 4px 16px -4px rgba(0, 0, 0, 0.05);
          transition: all 200ms;
        }

        .feature-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px -6px rgba(0, 0, 0, 0.08);
          border-color: rgba(16, 185, 129, 0.2);
          color: #111827;
        }

        .feature-icon {
          color: #10B981;
        }

        @media (max-width: 768px) {
          .hero-title {
            font-size: 2.75rem;
          }

          .hero-desc {
            font-size: 1.0625rem;
          }

          .landing-hero {
            padding: 60px 0 80px;
          }

          .hero-actions {
            flex-direction: column;
            width: 100%;
            max-width: 320px;
            margin: 0 auto 60px;
          }

          .hero-btn-primary,
          .hero-btn-secondary {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
