import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import BrandLogo from '@/components/brand/BrandLogo';

const ALLOWED_DESTINATIONS = new Set(['/dashboard', '/profilini-tamamla']);

export default async function CreatorCodeErrorPage({ searchParams }) {
  const params = await searchParams;
  const next = ALLOWED_DESTINATIONS.has(params?.next) ? params.next : '/dashboard';

  return (
    <main className="auth-shell auth-single">
      <section className="auth-card confirmation-card">
        <Link href="/" className="public-brand confirmation-brand" aria-label="calisiyo ana sayfa"><BrandLogo priority /></Link>
        <span className="confirmation-icon is-error"><AlertCircle size={26} /></span>
        <h2>Hesabın hazır</h2>
        <p>Girişin tamamlandı ancak içerik üretici kodun hesabına güvenli biçimde ilişkilendirilemedi. Tam fiyatlı ödeme başlatılmadı. Yardım için <a href="mailto:calisiyo.destek@gmail.com">calisiyo.destek@gmail.com</a> adresine yazabilirsin.</p>
        <Link className="public-button primary" href={next}>Hesabıma devam et</Link>
      </section>
    </main>
  );
}
