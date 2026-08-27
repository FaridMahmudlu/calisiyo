import Link from 'next/link';
import BrandLogo from '@/components/brand/BrandLogo';
import PricingSection from '@/components/landing/PricingSection';
import PublicFooter from '@/components/landing/PublicFooter';

export const metadata = {
  title: 'Paketler ve Fiyatlar',
  description: 'calisiyo ücretsiz ve calisiyo plus YKS çalışma koçu planlarını karşılaştır. Plus’ı 7 gün ücretsiz dene.',
  alternates: { canonical: '/paketler' },
};

export default function PaketlerPage() {
  return (
    <main className="story-landing public-pricing-page">
      <nav className="story-nav" aria-label="Ana navigasyon">
        <Link href="/" className="public-brand" aria-label="calisiyo ana sayfa"><BrandLogo priority /></Link>
        <div className="story-nav-links"><Link href="/rehber">Rehber</Link><Link href="/metodoloji">Metodoloji</Link><Link href="/paketler">Paketler</Link></div>
        <div className="landing-auth"><Link href="/giris">Giriş yap</Link><Link className="public-button primary" href="/kayit">Ücretsiz başla</Link></div>
      </nav>
      <div className="package-page-hero section-shell">
        <span className="public-kicker">Paketler</span>
        <h1>İki plan.<br />Tek net seçim.</h1>
        <p>Ücretsiz başla; daha geniş limitlere ihtiyaç duyduğunda sınav yılına uygun plus seçeneğini 7 gün dene.</p>
      </div>
      <PricingSection standalone />
      <PublicFooter />
    </main>
  );
}
