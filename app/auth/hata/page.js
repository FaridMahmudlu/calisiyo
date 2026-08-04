import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import BrandLogo from '@/components/brand/BrandLogo';

export default function AuthErrorPage() {
  return (
    <main className="auth-shell auth-single">
      <section className="auth-card confirmation-card">
        <Link href="/" className="public-brand confirmation-brand" aria-label="calisiyo ana sayfa"><BrandLogo priority /></Link>
        <span className="confirmation-icon is-error"><AlertCircle size={26} /></span>
        <h2>Giriş tamamlanamadı</h2>
        <p>Bağlantının süresi dolmuş olabilir. Giriş sayfasına dönüp tekrar deneyebilirsin.</p>
        <Link className="public-button primary" href="/giris">Giriş sayfasına dön</Link>
      </section>
    </main>
  );
}
