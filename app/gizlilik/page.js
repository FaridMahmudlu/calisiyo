import Link from 'next/link';
import BrandLogo from '@/components/brand/BrandLogo';

export const metadata = {
  title: 'Gizlilik Politikası – calisiyo',
  description: 'calisiyo YKS Çalışma Koçu platformunun gizlilik politikası ve kişisel veri işleme esasları.',
};

export default function GizlilikPage() {
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
        <span className="public-kicker">Yasal Bilgilendirme</span>
        <h1>Gizlilik Politikası</h1>
        <p className="legal-subtitle">Son Güncelleme Tarihi: 9 Ağustos 2026</p>

        <hr className="legal-divider" />

        <section className="legal-content">
          <h2>1. Giriş ve Kapsam</h2>
          <p>
            <strong>calisiyo</strong> (“Platform”), YKS (TYT, AYT, YDT) sınavlarına hazırlanan öğrencilerin çalışma programlarını düzenlemelerini, çalışma sürelerini ve deneme sonuçlarını takip etmelerini sağlayan dijital çalışma koçu hizmetidir. İşbu Gizlilik Politikası, calisiyo’yu ziyaret eden ve kullanan tüm kullanıcılarımızın (“Kullanıcı”) kişisel verilerinin nasıl toplandığını, kullanıldığını, saklandığını ve korunduğunu açıklamaktadır.
          </p>

          <h2>2. Toplanan Kişisel Veriler</h2>
          <p>calisiyo platformunda hizmet sunabilmek amacıyla yalnızca gerekli olan veriler toplanmaktadır:</p>
          <ul>
            <li><strong>Kimlik ve İletişim Bilgileri:</strong> Ad soyad, e-posta adresi, şifrelenmiş kimlik doğrulama parolası.</li>
            <li><strong>Akademik ve Alan Seçim Verileri:</strong> YKS hazırlık alanı (Sayısal, Eşit Ağırlık, Sözel, Dil), hedef üniversite/bölüm bilgileri.</li>
            <li><strong>Çalışma ve İlerleme Verileri:</strong> Günlük/haftalık ders programı kayıtları, çalışma süreleri (Pomodoro kayıtları), çözülen soru sayıları, deneme sınavı net ve süre sonuçları, konu tamamlama durumları ve kişisel notlar.</li>
            <li><strong>Teknik ve Kullanım Verileri:</strong> IP adresi, cihaz türü, tarayıcı bilgisi, oturum çerezleri, sayfa görüntüleme istatistikleri ve sistem hata logları.</li>
          </ul>

          <h2>3. Verilerin İşlenme Amaçları</h2>
          <p>Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:</p>
          <ul>
            <li>Kullanıcı hesabının oluşturulması, kimlik doğrulamasının yapılması ve güvenliğinin sağlanması.</li>
            <li>Kullanıcıya özel günlük/haftalık çalışma programı, deneme analizi ve grafiksel istatistiklerin üretilmesi.</li>
            <li>Platformun performansının artırılması, teknik hataların (Sentry) tespiti ve kullanıcı deneyiminin iyileştirilmesi (PostHog & Google Analytics).</li>
          </ul>

          <h2>4. 18 Yaş Altı Kullanıcılar ve Veli Bildirimi</h2>
          <p>
            calisiyo, YKS sınavına hazırlanan 18 yaş altı lise öğrencileri tarafından da kullanılmaktadır. 18 yaşından küçük kullanıcılarımızın platforma kaydolurken velilerinin veya kanuni temsilcilerinin bilgisi dahlinde hareket ettikleri kabul edilir. 18 yaş altı kullanıcılarımızdan yalnızca eğitim ve çalışma takibi için zorunlu olan asgari kişisel veriler talep edilmektedir.
          </p>

          <h2>5. Üçüncü Taraflarla Veri Paylaşımı</h2>
          <p>
            Kullanıcı verileri hiçbir şart altında üçüncü taraflara satılmaz veya pazarlama amacıyla kiralanmaz. Verileriniz yalnızca hizmetin yürütülebilmesi için zorunlu olan altyapı sağlayıcıları ile paylaşılır:
          </p>
          <ul>
            <li><strong>Supabase Inc.</strong> – Kimlik doğrulama ve veritabanı altyapısı (AB/ABD sunucuları, uçtan uca şifrelenmiş).</li>
            <li><strong>Vercel Inc.</strong> – Web barındırma (hosting) ve kenar sunucu hizmetleri.</li>
            <li><strong>PostHog Inc. & Google Analytics</strong> – Anonimleştirilmiş kullanım analitiği.</li>
            <li><strong>Sentry (Functional Software Inc.)</strong> – Anonimleştirilmiş hata ve çökme raporlama.</li>
          </ul>

          <h2>6. Veri Güvenliği ve Saklama Süresi</h2>
          <p>
            Verileriniz Supabase veritabanında endüstri standardı TLS/SSL şifreleme protokolleri ve Row Level Security (RLS) erişim denetimleri ile korunmaktadır. Hesabınız aktif olduğu sürece verileriniz saklanır. Hesabınızı sildiğinizde veya silme talebinde bulunduğunuzda tüm kişisel verileriniz ve çalışma kayıtlarınız sistemlerimizden kalıcı olarak silinir.
          </p>

          <h2>7. İletişim ve Veri Sahibi Hakları</h2>
          <p>
            Kişisel verilerinizle ilgili erişim, düzeltme veya silme taleplerinizi <a href="mailto:destek@calisiyo.com">destek@calisiyo.com</a> e-posta adresimiz üzerinden bize iletebilirsiniz. Talepleriniz en geç 30 gün içerisinde yanıtlanacaktır.
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
