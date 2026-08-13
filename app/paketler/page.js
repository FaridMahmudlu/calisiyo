import Link from 'next/link';
import BrandLogo from '@/components/brand/BrandLogo';
import PricingSection from '@/components/landing/PricingSection';
import PublicFooter from '@/components/landing/PublicFooter';

export const metadata = {
  title: 'Paketler ve Fiyatlar · calisiyo',
  description: 'calisiyo Başlangıç, Odak ve Zirve YKS çalışma koçu paketlerini karşılaştır.',
};

export default function PaketlerPage() {
  return (
    <main className="story-landing public-pricing-page">
      <nav className="story-nav" aria-label="Ana navigasyon">
        <Link href="/" className="public-brand" aria-label="calisiyo ana sayfa"><BrandLogo priority /></Link>
        <div className="story-nav-links"><Link href="/#yolculuk">Çalışma yolu</Link><Link href="/#araclar">Araçlar</Link><Link href="/paketler">Paketler</Link></div>
        <div className="landing-auth"><Link href="/giris">Giriş yap</Link><Link className="public-button primary" href="/kayit">Ücretsiz başla</Link></div>
      </nav>
      <div className="package-page-hero section-shell">
        <span className="public-kicker">Paketler</span>
        <h1>Önce düzenini kur.<br />İhtiyacın olduğunda büyü.</h1>
        <p>Bütün planlar gerçek çalışma verilerini temel alır. Ücretli paketler otomatik yenilenmez.</p>
      </div>
      <PricingSection standalone />
      <PublicFooter />
    </main>
  );
}
