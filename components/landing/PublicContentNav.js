import Link from 'next/link';
import BrandLogo from '@/components/brand/BrandLogo';

export default function PublicContentNav() {
  return (
    <nav className="story-nav content-nav" aria-label="Ana navigasyon">
      <Link href="/" className="public-brand" aria-label="calisiyo ana sayfa"><BrandLogo priority /></Link>
      <div className="story-nav-links">
        <Link href="/rehber">Rehber</Link>
        <Link href="/metodoloji">Metodoloji</Link>
        <Link href="/paketler">Paketler</Link>
      </div>
      <div className="landing-auth">
        <Link href="/giris">Giriş yap</Link>
        <Link className="public-button primary" href="/kayit">Ücretsiz başla</Link>
      </div>
    </nav>
  );
}
