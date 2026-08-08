import Link from 'next/link';
import { PiArrowLeft, PiCompass } from 'react-icons/pi';
import BrandLogo from '@/components/brand/BrandLogo';

export const metadata = {
  title: 'Sayıfa Bulunamadı (404) – calisiyo',
};

export default function NotFound() {
  return (
    <main className="story-landing auth-single" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <section className="auth-card confirmation-card" style={{ maxWidth: '520px', padding: '48px 36px' }}>
        <div className="confirmation-brand">
          <Link href="/" aria-label="calisiyo ana sayfa">
            <BrandLogo priority />
          </Link>
        </div>
        <div className="confirmation-icon" style={{ background: '#eaf8f2', color: '#00a870', width: '64px', height: '64px', margin: '0 auto 24px' }}>
          <PiCompass size={32} />
        </div>
        <span className="public-kicker" style={{ margin: '0 auto 12px' }}>404 · Hata</span>
        <h1 style={{ fontSize: '2.2rem', margin: '12px 0 8px', letterSpacing: '-0.04em', color: '#10251f' }}>
          Aradığın sayfa rotadan çıktı.
        </h1>
        <p style={{ color: '#587067', fontSize: '0.92rem', lineHeight: '1.6', margin: '0 0 28px' }}>
          Görünüşe göre girdiğin adres mevcut değil veya taşınmış olabilir. Çalışma yoluna hemen geri dönebilirsin.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Link className="public-button primary" href="/">
            <PiArrowLeft size={18} /> Ana sayfaya dön
          </Link>
          <Link className="public-button" href="/dashboard">
            Panelle devam et
          </Link>
        </div>
      </section>
    </main>
  );
}
