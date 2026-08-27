import Link from 'next/link';
import BrandLogo from '@/components/brand/BrandLogo';
import PublicFooter from '@/components/landing/PublicFooter';
import { getLegalBusinessConfig } from '@/lib/billing/config';
import { SITE } from '@/lib/seo/site';

export const metadata = {
  title: 'İletişim',
  description: 'calisiyo YKS Çalışma Koçu platformu iletişim ve operatör bilgileri.',
  alternates: { canonical: '/iletisim' },
};

export default function IletisimPage() {
  const contact = getLegalBusinessConfig();
  return (
    <main className="story-landing">
      <nav className="story-nav" aria-label="Ana navigasyon">
        <Link href="/" className="public-brand" aria-label="calisiyo ana sayfa">
          <BrandLogo priority />
        </Link>
        <div className="landing-auth">
          <Link href="/giris">Giriş yap</Link>
          <Link className="public-button primary" href="/kayit">Ücretsiz başla</Link>
        </div>
      </nav>

      <div className="legal-shell section-shell">
        <span className="public-kicker">İletişim</span>
        <h1>Bize Ulaşın</h1>
        <p className="legal-subtitle">Sorularınız, geri bildirimleriniz veya veri talepleriniz için iletişim kanallarımız.</p>

        <hr className="legal-divider" />

        <section className="legal-content">
          <h2>1. Operatör Bilgileri</h2>
          <p>
            <strong>calisiyo</strong>, YKS hazırlık sürecindeki öğrencilere planlama, odaklanma ve ilerleme takibi sunan dijital eğitim hizmetidir.
          </p>
          <ul>
            <li><strong>Hizmet Sağlayıcı & Veri Sorumlusu:</strong> {contact.legalName || 'calisiyo bireysel platform işletmecisi'}</li>
            <li><strong>Proje Adı:</strong> calisiyo – YKS Çalışma Koçu</li>
            <li><strong>Telefon:</strong> <a href={`tel:${contact.phoneHref}`}>{contact.phoneDisplay}</a></li>
            <li><strong>Adres:</strong> {contact.address}</li>
            {contact.supportEmail && <li><strong>Resmi İletişim E-posta:</strong> <a href={`mailto:${contact.supportEmail}`}>{contact.supportEmail}</a></li>}
            <li><strong>Web Sitesi:</strong> <a href={SITE.origin} target="_blank" rel="noopener noreferrer">{SITE.origin}</a></li>
          </ul>

          <h2>2. Destek ve Geri Bildirim</h2>
          <p>
            Platform kullanımıyla ilgili teknik sorunlar, hesap işlemleri, veri silme talepleri veya önerileriniz için telefon ve ilan edilen destek e-postası üzerinden bizimle iletişime geçebilirsiniz. Başvurular en kısa sürede incelenir.
          </p>

          <h2>3. KVKK ve Veri Talepleri</h2>
          <p>
            6698 sayılı KVKK kapsamındaki bilgi edinme, veri silme veya erişim talepleriniz için lütfen e-postanızın konu kısmına <strong>&quot;KVKK Veri Talebi&quot;</strong> yazarak başvuruda bulununuz.
          </p>
        </section>
      </div>

      <PublicFooter />
    </main>
  );
}
