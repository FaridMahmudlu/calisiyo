import Link from 'next/link';
import { PiArrowRight, PiCheckCircle, PiSparkle } from 'react-icons/pi';
import PublicContentNav from '@/components/landing/PublicContentNav';
import PublicFooter from '@/components/landing/PublicFooter';
import JsonLd from '@/components/seo/JsonLd';
import { FEATURES } from '@/lib/seo/features';
import { absoluteUrl, SITE } from '@/lib/seo/site';

export const metadata = {
  title: 'YKS Çalışma Uygulaması Özellikleri',
  description: 'Calisiyo’nun YKS planlama, YouTube kampı aktarımı, Kronometre, istatistik, deneme, konu takibi ve canlı çalışma sınıfı özelliklerini incele.',
  alternates: { canonical: '/ozellikler' },
  openGraph: { title: 'Calisiyo özellikleri', description: 'YKS çalışma düzenini planlamak, uygulamak ve gerçek kayıtlarla takip etmek için Calisiyo araçları.', url: '/ozellikler' },
};

export default function FeaturesPage() {
  const pageUrl = absoluteUrl('/ozellikler');
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', '@id': `${pageUrl}#collection`, url: pageUrl, name: metadata.title, description: metadata.description, inLanguage: SITE.language, isPartOf: { '@id': `${SITE.origin}/#website` } },
      { '@type': 'ItemList', '@id': `${pageUrl}#features`, itemListElement: FEATURES.map((feature, index) => ({ '@type': 'ListItem', position: index + 1, name: feature.shortTitle, url: absoluteUrl(`/ozellikler/${feature.slug}`) })) },
      { '@type': 'BreadcrumbList', '@id': `${pageUrl}#breadcrumb`, itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Ana sayfa', item: absoluteUrl('/') }, { '@type': 'ListItem', position: 2, name: 'Özellikler', item: pageUrl }] },
    ],
  };

  return (
    <main className="story-landing content-page feature-page">
      <JsonLd data={jsonLd} />
      <PublicContentNav />
      <header className="content-hero section-shell">
        <nav className="content-breadcrumb" aria-label="İçerik yolu"><ol><li><Link href="/">Ana sayfa</Link></li><li aria-current="page">Özellikler</li></ol></nav>
        <span className="public-kicker"><PiSparkle /> Calisiyo özellikleri</span>
        <h1>Planla. Çalış.<br />Gerçeği gör.</h1>
        <p>Programından çalışma sürene, denemenden arkadaşlarınla ortak odağa kadar YKS düzeninin farklı parçalarını aynı hesapta bir araya getir.</p>
      </header>

      <section className="feature-index section-shell" aria-label="Calisiyo özellikleri">
        {FEATURES.map((feature, index) => (
          <article className="feature-index-row" key={feature.slug}>
            <span className="feature-index-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <div><span>{feature.kicker}</span><h2><Link href={`/ozellikler/${feature.slug}`}>{feature.shortTitle}</Link></h2></div>
            <p>{feature.description}</p>
            <Link className="feature-index-link" href={`/ozellikler/${feature.slug}`} aria-label={`${feature.shortTitle} detaylarını incele`}>İncele <PiArrowRight /></Link>
          </article>
        ))}
      </section>

      <section className="feature-principle section-shell" aria-labelledby="ozellik-yaklasimi">
        <div><span>Tek çalışma düzeni</span><h2 id="ozellik-yaklasimi">Birbirinden kopuk sayaçlar değil, aynı kayda bakan araçlar.</h2></div>
        <ul>
          <li><PiCheckCircle /><span><strong>Gerçek veri</strong>İstatistikler yalnızca hesabına kaydettiğin çalışmalarla oluşur.</span></li>
          <li><PiCheckCircle /><span><strong>Açık sınırlar</strong>Plan kapsamı ve özellik limitleri satın almadan önce görünürdür.</span></li>
          <li><PiCheckCircle /><span><strong>Öğrenci kontrolü</strong>Programı, konuyu ve çalışma kararını sen yönetirsin.</span></li>
        </ul>
      </section>

      <section className="content-trust-band section-shell">
        <div><span>Başlamaya hazır mısın?</span><h2>Kendi çalışma düzenini bugün kur.</h2><p>Ücretsiz hesapla temel araçları kullanabilir, ihtiyacın olduğunda güncel paket kapsamını inceleyebilirsin.</p></div>
        <Link className="public-button primary" href="/kayit">Ücretsiz başla <PiArrowRight /></Link>
      </section>
      <PublicFooter />
    </main>
  );
}
