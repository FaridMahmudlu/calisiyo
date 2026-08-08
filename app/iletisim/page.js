import Link from 'next/link';
import BrandLogo from '@/components/brand/BrandLogo';

export const metadata = {
  title: 'İletişim – calisiyo',
  description: 'calisiyo YKS Çalışma Koçu platformu iletişim ve operatör bilgileri.',
};

export default function IletisimPage() {
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
            <strong>calisiyo</strong>, YKS hazırlık sürecindeki öğrencilere destek olmak amacıyla geliştirilmiş bireysel bir ed-tech projesidir.
          </p>
          <ul>
            <li><strong>Hizmet Sağlayıcı & Veri Sorumlusu:</strong> calisiyo Ekibi</li>
            <li><strong>Proje Adı:</strong> calisiyo – YKS Çalışma Koçu</li>
            <li><strong>Resmi İletişim E-posta:</strong> <a href="mailto:destek@calisiyo.com">destek@calisiyo.com</a></li>
            <li><strong>Web Sitesi:</strong> <a href="https://calisiyo-theta.vercel.app" target="_blank" rel="noopener noreferrer">https://calisiyo-theta.vercel.app</a></li>
          </ul>

          <h2>2. Destek ve Geri Bildirim</h2>
          <p>
            Platform kullanımıyla ilgili teknik sorunlar, hesap işlemleri, veri silme talepleri veya önerileriniz için e-posta adreslerimiz üzerinden bizimle günün her saati iletişime geçebilirsiniz. Gönderdiğiniz iletiler en kısa sürede incelenerek tarafınıza dönüş yapılacaktır.
          </p>

          <h2>3. KVKK ve Veri Talepleri</h2>
          <p>
            6698 sayılı KVKK kapsamındaki bilgi edinme, veri silme veya erişim talepleriniz için lütfen e-postanızın konu kısmına <strong>&quot;KVKK Veri Talebi&quot;</strong> yazarak başvuruda bulununuz.
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
