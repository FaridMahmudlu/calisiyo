import Link from 'next/link';
import BrandLogo from '@/components/brand/BrandLogo';
import PublicFooter from '@/components/landing/PublicFooter';
import { getLegalBusinessConfig } from '@/lib/billing/config';

export const metadata = {
  title: 'Hesap ve Veri Silme',
  description: 'calisiyo hesabını ve çalışma verilerini uygulamadan, web sitesinden veya e-posta ile kalıcı olarak silme adımları.',
  alternates: { canonical: '/hesap-silme' },
};

export default function AccountDeletionPage() {
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
        <span className="public-kicker">Hesap</span>
        <h1>Hesap ve Veri Silme</h1>
        <p className="legal-subtitle">calisiyo hesabını ve buna bağlı çalışma verilerini istediğin zaman kalıcı olarak silebilirsin.</p>

        <hr className="legal-divider" />

        <section className="legal-content">
          <h2>1. Mobil uygulamadan</h2>
          <ol>
            <li>calisiyo uygulamasını aç ve hesabına giriş yap.</li>
            <li><strong>Daha</strong> sekmesinden <strong>Ayarlar</strong>’a git.</li>
            <li><strong>Hesabımı kalıcı olarak sil</strong> seçeneğine dokun ve onay metnini yazarak işlemi tamamla.</li>
          </ol>

          <h2>2. Web sitesinden</h2>
          <ol>
            <li><Link href="/giris">calisiyo.com.tr/giris</Link> adresinden giriş yap.</li>
            <li><Link href="/dashboard/ayarlar">Ayarlar</Link> sayfasındaki <strong>Hesabı sil</strong> bölümünü kullan.</li>
          </ol>

          <h2>3. Giriş yapamıyorsan</h2>
          <p>
            Hesabına kayıtlı e-posta adresinden <a href={`mailto:${contact.supportEmail}?subject=Hesap%20silme%20talebi`}>{contact.supportEmail}</a> adresine
            <strong> &quot;Hesap silme talebi&quot;</strong> konulu bir e-posta gönder. Kimliğini doğruladıktan sonra hesabını en geç 30 gün içinde sileriz.
          </p>

          <h2>4. Silinen ve saklanan veriler</h2>
          <ul>
            <li><strong>Silinir:</strong> hesap ve profil bilgileri, çalışma programları, görevler, konu takibi, denemeler, notlar, hedefler, istatistikler, sınıf üyelikleri, bildirim ve cihaz kayıtları ile yüklediğin dosyalar.</li>
            <li><strong>Kimliğinden ayrılarak saklanır:</strong> yasal saklama yükümlülüğü bulunan ödeme ve fatura kayıtları, ilgili mevzuatın öngördüğü süre boyunca saklanır.</li>
            <li>Silme işlemi geri alınamaz. Aktif bir ücretli paketin varsa kalan süresi silme ile birlikte sona erer.</li>
          </ul>
        </section>
      </div>

      <PublicFooter />
    </main>
  );
}
