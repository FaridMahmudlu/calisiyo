import Link from 'next/link';
import BrandLogo from '@/components/brand/BrandLogo';
import PublicFooter from '@/components/landing/PublicFooter';
import { getLegalBusinessConfig } from '@/lib/billing/config';

export const metadata = {
  title: 'Gizlilik Politikası',
  description: 'calisiyo YKS Çalışma Koçu platformunun gizlilik politikası ve kişisel veri işleme esasları.',
  alternates: { canonical: '/gizlilik' },
};

export default function GizlilikPage() {
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
        <span className="public-kicker">Yasal Bilgilendirme</span>
        <h1>Gizlilik Politikası</h1>
        <p className="legal-subtitle">Son Güncelleme Tarihi: 3 Eylül 2026</p>

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
            <li><strong>Çalışma ve İlerleme Verileri:</strong> Günlük/haftalık ders programı kayıtları, çalışma süreleri (Kronometre kayıtları), çözülen soru sayıları, deneme sınavı net ve süre sonuçları, konu tamamlama durumları ve kişisel notlar.</li>
            <li><strong>İçerik Üretici Kodu Verisi:</strong> Yalnızca kayıt sırasında isteğe bağlı olarak girilen kod, kodun doğrulanma zamanı ve hesaba tanımlanan indirim ilişkisi. Bu ilişki sonradan değiştirilemez; içerik üreticisine adınız, e-posta adresiniz veya çalışma verileriniz gösterilmez.</li>
            <li><strong>Teknik ve Kullanım Verileri:</strong> IP adresi, cihaz türü, tarayıcı bilgisi, oturum çerezleri, sayfa görüntüleme istatistikleri ve sistem hata logları.</li>
          </ul>

          <h2>3. Verilerin İşlenme Amaçları</h2>
          <p>Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:</p>
          <ul>
            <li>Kullanıcı hesabının oluşturulması, kimlik doğrulamasının yapılması ve güvenliğinin sağlanması.</li>
            <li>Kullanıcıya özel günlük/haftalık çalışma programı, deneme analizi ve grafiksel istatistiklerin üretilmesi.</li>
            <li>İsteğe bağlı içerik üretici kodunun kayıt hesabıyla eşleştirilmesi, uygun indirimin uygulanması ve içerik üreticisine yalnızca toplulaştırılmış kayıt, aktivasyon, deneme ve doğrulanmış satış sayılarının sunulması.</li>
            <li>Platformun performansının artırılması, kişisel içerik gönderilmeyen teknik hata kayıtlarıyla (Sentry) sorunların tespiti ve yalnızca açık çerez izni verildiğinde PostHog ile Google Analytics üzerinden kullanıcı deneyiminin iyileştirilmesi.</li>
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
            <li><strong>Supabase Inc.</strong> – Kimlik doğrulama ve veritabanı altyapısı; aktarım sırasında TLS ve sunucu tarafı erişim kontrolleri kullanılır.</li>
            <li><strong>Vercel Inc.</strong> – Web barındırma (hosting) ve kenar sunucu hizmetleri.</li>
            <li><strong>PostHog Inc. & Google Analytics</strong> – Yalnızca isteğe bağlı analitik izni verildiğinde ürün ve trafik ölçümü.</li>
            <li><strong>Sentry (Functional Software Inc.)</strong> – Oturum tekrarı kapalı, kimlik ve istek içeriği ayıklanmış teknik hata ve çökme raporlama.</li>
          </ul>

          <h2>6. Veri Güvenliği ve Saklama Süresi</h2>
          <p>
            Verileriniz aktarım sırasında TLS/SSL ve veritabanında Row Level Security (RLS) erişim denetimleriyle korunur. Hesabınız aktif olduğu sürece çalışma verileriniz saklanır. Geçerli bir silme talebi sonrasında çalışma ve profil kayıtları silinir; ödeme, sözleşme kabulü, dolandırıcılık önleme ve mali kayıtlar ise yalnızca ilgili mevzuatın zorunlu tuttuğu süre boyunca kullanıcı hesabından ayrıştırılarak saklanır ve süre sonunda silinir veya anonimleştirilir.
          </p>

          <h2>7. İletişim ve Veri Sahibi Hakları</h2>
          <p>
            Kişisel verilerinizle ilgili erişim, düzeltme veya silme taleplerinizi <a href={`tel:${contact.phoneHref}`}>{contact.phoneDisplay}</a> üzerinden{contact.supportEmail ? <> veya <a href={`mailto:${contact.supportEmail}`}>{contact.supportEmail}</a> adresine</> : ''} iletebilirsiniz. Talepleriniz mevzuattaki süreler içinde yanıtlanır.
          </p>
        </section>
      </div>

      <PublicFooter />
    </main>
  );
}
