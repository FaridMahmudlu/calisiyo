import Link from 'next/link';
import { PiArrowRight, PiChartLineUp, PiChecks, PiShieldCheck } from 'react-icons/pi';
import PublicContentNav from '@/components/landing/PublicContentNav';
import PublicFooter from '@/components/landing/PublicFooter';
import JsonLd from '@/components/seo/JsonLd';
import { absoluteUrl, SITE } from '@/lib/seo/site';

export const metadata = {
  title: 'Hakkımızda',
  description: 'Calisiyo’nun YKS öğrencileri için geliştirdiği çalışma düzenini, ürün yaklaşımını, veri ilkelerini ve iletişim bilgilerini incele.',
  alternates: { canonical: '/hakkimizda' },
  openGraph: { title: 'Calisiyo hakkında', description: 'YKS planlama ve çalışma takibini gerçek kullanıcı kayıtlarıyla bir araya getiren Calisiyo’nun ürün yaklaşımı.', url: '/hakkimizda' },
};

export default function AboutPage() {
  const pageUrl = absoluteUrl('/hakkimizda');
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'AboutPage', '@id': pageUrl, url: pageUrl, name: metadata.title, description: metadata.description, inLanguage: SITE.language, isPartOf: { '@id': `${SITE.origin}/#website` }, about: { '@id': `${SITE.origin}/#organization` } },
      { '@type': 'BreadcrumbList', '@id': `${pageUrl}#breadcrumb`, itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Ana sayfa', item: absoluteUrl('/') }, { '@type': 'ListItem', position: 2, name: 'Hakkımızda', item: pageUrl }] },
    ],
  };

  return (
    <main className="story-landing content-page about-page">
      <JsonLd data={jsonLd} />
      <PublicContentNav />
      <header className="content-hero section-shell">
        <nav className="content-breadcrumb" aria-label="İçerik yolu"><ol><li><Link href="/">Ana sayfa</Link></li><li aria-current="page">Hakkımızda</li></ol></nav>
        <span className="public-kicker">Calisiyo hakkında</span>
        <h1>Çalışma kararını<br />görünür hâle getir.</h1>
        <p>Calisiyo; YKS öğrencilerinin planlama, çalışma, konu ve deneme kayıtlarını birbirinden kopuk araçlar yerine aynı düzen içinde yönetmesi için geliştirilen bir web uygulamasıdır.</p>
      </header>

      <section className="about-statement section-shell" aria-labelledby="neden"><span>Çözdüğümüz problem</span><h2 id="neden">Bir planın değeri, yazıldığında değil uygulandığında ortaya çıkar.</h2><p>Öğrenciler çoğu zaman programı bir yerde, süreyi başka bir yerde, deneme ve konu sonuçlarını ise farklı notlarda tutuyor. Calisiyo bu kayıtları bir araya getirerek bugünkü görevi, gerçekleşen çalışmayı ve sonraki kararı aynı akışta görünür kılar.</p></section>

      <section className="about-values section-shell" aria-label="Ürün ilkeleri">
        <article><PiChecks /><span>01</span><h2>Uygulanabilir plan</h2><p>Görevler ders, konu, tarih, süre ve soru hedefi gibi ölçülebilir ayrıntılarla tanımlanır.</p></article>
        <article><PiChartLineUp /><span>02</span><h2>Gerçek kayıt</h2><p>Süre, seri ve istatistikler kullanıcının gerçekten kaydettiği çalışma etkinliklerinden oluşur.</p></article>
        <article><PiShieldCheck /><span>03</span><h2>Açık sınırlar</h2><p>Calisiyo akademik başarı, puan veya sıralama garantisi vermez; göstergeler karar vermeyi destekler.</p></article>
      </section>

      <section className="about-product section-shell">
        <div><span>Bugün Calisiyo’da</span><h2>Planlamadan birlikte çalışmaya uzanan tek ürün.</h2></div>
        <div><p>Günlük ve haftalık program, YouTube video planı, Kronometre, çalışma istatistikleri, konu takibi, deneme analizi ve canlı çalışma sınıfları aynı hesapta kullanılabilir.</p><p>Özellik kapsamı ve limitler üyelik planına göre değişebilir. Güncel karşılaştırma her zaman Paketler sayfasında gösterilir.</p><div><Link href="/ozellikler">Tüm özellikler <PiArrowRight /></Link><Link href="/paketler">Paketleri karşılaştır <PiArrowRight /></Link></div></div>
      </section>

      <section className="about-links section-shell" aria-label="Şeffaflık ve iletişim">
        <Link href="/metodoloji"><span>Veriler nasıl hesaplanır?</span><strong>Metodolojiyi incele</strong></Link>
        <Link href="/rehber"><span>Çalışma düzeni nasıl kurulur?</span><strong>Rehberleri oku</strong></Link>
        <Link href="/iletisim"><span>Sorun veya önerin mi var?</span><strong>Bizimle iletişime geç</strong></Link>
        <Link href="/gizlilik"><span>Veriler nasıl ele alınır?</span><strong>Gizlilik politikasını gör</strong></Link>
      </section>
      <PublicFooter />
    </main>
  );
}
