import Link from 'next/link';
import BrandLogo from '@/components/brand/BrandLogo';
import PublicFooter from './PublicFooter';

export default function LegalPageLayout({ kicker = 'Yasal Bilgilendirme', title, subtitle, children }) {
  return (
    <main className="story-landing">
      <nav className="story-nav" aria-label="Ana navigasyon">
        <Link href="/" className="public-brand" aria-label="calisiyo ana sayfa"><BrandLogo priority /></Link>
        <div className="story-nav-links"><Link href="/paketler">Paketler</Link><Link href="/iletisim">İletişim</Link></div>
        <div className="landing-auth"><Link href="/giris">Giriş yap</Link><Link className="public-button primary" href="/kayit">Ücretsiz başla</Link></div>
      </nav>
      <div className="legal-shell section-shell">
        <span className="public-kicker">{kicker}</span>
        <h1>{title}</h1>
        <p className="legal-subtitle">{subtitle}</p>
        <hr className="legal-divider" />
        <section className="legal-content">{children}</section>
      </div>
      <PublicFooter />
    </main>
  );
}
