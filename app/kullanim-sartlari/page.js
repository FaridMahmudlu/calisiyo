import Link from 'next/link';
import BrandLogo from '@/components/brand/BrandLogo';

export const metadata = {
  title: 'Kullanım Şartları – calisiyo',
  description: 'calisiyo YKS Çalışma Koçu hizmet kullanım şartları ve kuralları.',
};

export default function KullanimSartlariPage() {
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
        <span className="public-kicker">Kullanım Şartları</span>
        <h1>Hizmet Kullanım Şartları</h1>
        <p className="legal-subtitle">Son Güncelleme Tarihi: 9 Ağustos 2026</p>

        <hr className="legal-divider" />

        <section className="legal-content">
          <h2>1. Taraf ve Amaç</h2>
          <p>
            İşbu Kullanım Şartları, <strong>calisiyo</strong> (“Platform”) web sitesi ve dijital araçlarının kullanımı ile ilgili kuralları belirler. Platforma kaydolan veya Platformu kullanan her Kullanıcı, işbu Kullanım Şartları hükümlerini okuduğunu, anladığını ve kabul ettiğini beyan eder.
          </p>

          <h2>2. Hesap Oluşturma ve Güvenlik</h2>
          <ul>
            <li>Kullanıcı, kayıt olurken doğru, güncel ve eksiksiz bilgi vermekle yükümlüdür.</li>
            <li>Hesap şifresinin gizliliğini ve güvenliğini sağlamak tamamen Kullanıcı’nın sorumluluğundadır. Hesabınız altında gerçekleşen tüm işlemlerden Kullanıcı sorumludur.</li>
            <li>18 yaş altı kullanıcılarımızın platformu kullanırken velilerinin veya kanuni temsilcilerinin rızası dahilinde hareket ettikleri kabul edilir.</li>
          </ul>

          <h2>3. Kabul Edilebilir Kullanım</h2>
          <p>Platformu kullanırken aşağıdaki eylemlerde bulunulması kesinlikle yasaktır:</p>
          <ul>
            <li>Platformun güvenliğini, bütünlüğünü veya sunucu performansını tehlikeye atacak tersine mühendislik, otomatik veri çekme (scraping) veya bot kullanımları,</li>
            <li>Başkasına ait hesap bilgilerini izinsiz kullanma veya yanıltıcı kimlik beyanında bulunma,</li>
            <li>Platform altyapısına aşırı yük bindirecek veya diğer kullanıcıların erişimini engelleyecek kötü niyetli girişimler.</li>
          </ul>

          <h2>4. Hizmetin Niteliği ve Sorumluluk Sınırı</h2>
          <p>
            calisiyo, öğrencilerin YKS hazırlık süreçlerini desteklemek amacıyla sunulan ücretsiz bir dijital ajanda ve analiz aracıdır. Platformda sunulan istatistikler ve tahminler kullanıcı tarafından girilen verilere dayanır. calisiyo, sınav başarısı veya resmi sınav sonuçları konusunda herhangi bir hukuki taahhüt veya garanti vermez.
          </p>

          <h2>5. Fikri Mülkiyet Hakları</h2>
          <p>
            calisiyo ismi, logosu, kaynak kodları, arayüz tasarımı, 3D görsel ögeleri ve yazılım mimarisi üzerindeki tüm fikri mülkiyet hakları calisiyo platformuna aittir. Yazılı izin alınmaksızın kopyalanamaz veya çoğaltılamaz.
          </p>

          <h2>6. Değişiklikler ve Fesih</h2>
          <p>
            calisiyo, Kullanım Şartları’nı dilediği zaman güncelleme hakkını saklı tutar. Güncellenmiş şartlar web sitesinde yayınlandığı andan itibaren yürürlüğe girer. Şartlara aykırı davranan kullanıcıların hesapları önceden bildirimde bulunulmaksızın askıya alınabilir veya silinebilir.
          </p>

          <h2>7. İletişim</h2>
          <p>
            Kullanım şartları ile ilgili her türlü soru ve görüşleriniz için <a href="mailto:destek@calisiyo.com">destek@calisiyo.com</a> e-posta adresi üzerinden bizimle iletişime geçebilirsiniz.
          </p>
        </section>
      </div>

      <footer className="story-footer">
        <div className="section-shell footer-grid">
          <div>
            <Link href="/" className="public-brand" aria-label="calisiyo ana sayfa">
              <BrandLogo />
            </Link>
            <p>YKS hazırlığını net bir çalışma yoluna dönüştür.</p>
          </div>
          <div>
            <strong>Ürün</strong>
            <Link href="/#yolculuk">Çalışma yolu</Link>
            <Link href="/#araclar">Araçlar</Link>
            <Link href="/#rehber">Başlangıç rehberi</Link>
          </div>
          <div>
            <strong>Yasal & İletişim</strong>
            <Link href="/gizlilik">Gizlilik Politikası</Link>
            <Link href="/kvkk">KVKK Aydınlatma Metni</Link>
            <Link href="/kullanim-sartlari">Kullanım Şartları</Link>
            <Link href="/iletisim">İletişim</Link>
          </div>
          <small>© 2026 calisiyo · YKS Çalışma Koçu</small>
        </div>
      </footer>
    </main>
  );
}
