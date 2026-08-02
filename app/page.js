import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-container">
          <Link href="/" className="landing-logo">
            <span>📖</span>
            <span className="landing-logo-text">calisiyo</span>
          </Link>
          <div className="landing-nav">
            <Link href="/giris" className="landing-nav-link">Giriş Yap</Link>
            <Link href="/kayit" className="landing-nav-cta">Başla →</Link>
          </div>
        </div>
      </header>

      <main className="landing-hero">
        <div className="landing-container">
          <div className="hero-badge">🎯 YKS 2027 Hazırlığın</div>
          <h1 className="hero-title">
            Çalışma planını <br />
            <span className="hero-highlight">tek yerden</span> yönet.
          </h1>
          <p className="hero-desc">
            Günlük program, deneme analizi, konu takibi, kaynak yönetimi ve daha fazlası.
            Minimal, hızlı ve mobil uyumlu.
          </p>
          <div className="hero-actions">
            <Link href="/kayit" className="hero-btn-primary">
              Ücretsiz Başla →
            </Link>
            <Link href="/giris" className="hero-btn-secondary">
              Giriş Yap
            </Link>
          </div>

          <div className="hero-features">
            <div className="feature-item">
              <span className="feature-icon">📅</span>
              <span>Günlük Program</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📊</span>
              <span>Deneme Analizi</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📋</span>
              <span>Konu Takibi</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🍅</span>
              <span>Pomodoro</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📚</span>
              <span>Kaynak Yönetimi</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📈</span>
              <span>İstatistikler</span>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .landing {
          min-height: 100vh;
          background: linear-gradient(180deg, #ECFDF5 0%, #FFFFFF 40%, #FFFFFF 100%);
        }

        .landing-container {
          max-width: 1080px;
          margin: 0 auto;
          padding: 0 24px;
        }

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
          font-size: 1.5rem;
          text-decoration: none;
          color: inherit;
        }

        .landing-logo-text {
          font-weight: 800;
          background: linear-gradient(135deg, #059669, #34D399);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .landing-nav {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .landing-nav-link {
          font-size: 0.875rem;
          font-weight: 500;
          color: #4B5563;
          text-decoration: none;
          padding: 8px 16px;
          border-radius: 10px;
          transition: background 150ms;
        }

        .landing-nav-link:hover {
          background: #F3F4F6;
        }

        .landing-nav-cta {
          font-size: 0.875rem;
          font-weight: 600;
          color: white;
          background: linear-gradient(135deg, #10B981, #059669);
          padding: 10px 20px;
          border-radius: 12px;
          text-decoration: none;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
          transition: all 150ms;
        }

        .landing-nav-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }

        .landing-hero {
          padding: 80px 0 100px;
          text-align: center;
        }

        .hero-badge {
          display: inline-block;
          padding: 6px 16px;
          background: #D1FAE5;
          color: #047857;
          border-radius: 100px;
          font-size: 0.8125rem;
          font-weight: 600;
          margin-bottom: 24px;
        }

        .hero-title {
          font-size: 3.5rem;
          font-weight: 800;
          line-height: 1.15;
          color: #111827;
          margin-bottom: 20px;
          letter-spacing: -0.02em;
        }

        .hero-highlight {
          background: linear-gradient(135deg, #10B981, #059669);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-desc {
          font-size: 1.125rem;
          color: #6B7280;
          max-width: 520px;
          margin: 0 auto 36px;
          line-height: 1.7;
        }

        .hero-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-bottom: 60px;
        }

        .hero-btn-primary {
          padding: 14px 32px;
          background: linear-gradient(135deg, #10B981, #059669);
          color: white;
          border-radius: 14px;
          font-weight: 600;
          font-size: 1rem;
          text-decoration: none;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
          transition: all 200ms;
        }

        .hero-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.45);
        }

        .hero-btn-secondary {
          padding: 14px 32px;
          background: white;
          color: #374151;
          border-radius: 14px;
          font-weight: 500;
          font-size: 1rem;
          text-decoration: none;
          border: 1.5px solid #E5E7EB;
          transition: all 150ms;
        }

        .hero-btn-secondary:hover {
          border-color: #D1D5DB;
          background: #F9FAFB;
        }

        .hero-features {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 12px;
          max-width: 620px;
          margin: 0 auto;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          font-size: 0.8125rem;
          font-weight: 500;
          color: #374151;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }

        .feature-icon {
          font-size: 1rem;
        }

        @media (max-width: 768px) {
          .hero-title {
            font-size: 2.25rem;
          }

          .hero-desc {
            font-size: 1rem;
          }

          .landing-hero {
            padding: 48px 0 60px;
          }

          .hero-actions {
            flex-direction: column;
          }

          .hero-btn-primary,
          .hero-btn-secondary {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
