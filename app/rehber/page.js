import Link from 'next/link';
import { PiArrowRight, PiBooks, PiChartLineUp, PiCheckCircle } from 'react-icons/pi';
import PublicContentNav from '@/components/landing/PublicContentNav';
import PublicFooter from '@/components/landing/PublicFooter';
import GuideCard from '@/components/seo/GuideCard';
import JsonLd from '@/components/seo/JsonLd';
import { CONTENT_UPDATED_AT, formatEditorialDate, GUIDES } from '@/lib/seo/content';
import { absoluteUrl, SITE } from '@/lib/seo/site';

export const metadata = {
  title: 'YKS Çalışma Rehberi',
  description: 'YKS çalışma programı, konu takibi, deneme analizi ve çalışma süresi için gerçek kayıtlara dayalı, uygulanabilir Calisiyo rehberleri.',
  alternates: { canonical: '/rehber' },
  openGraph: {
    title: 'YKS Çalışma Rehberi · calisiyo',
    description: 'Planını kurmak, çalışma kayıtlarını anlamak ve sonraki adımını belirlemek için uygulanabilir YKS rehberleri.',
    url: '/rehber',
  },
};

export default function GuideHubPage() {
  const pageUrl = absoluteUrl('/rehber');
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${pageUrl}#collection`,
        url: pageUrl,
        name: 'YKS Çalışma Rehberi',
        description: metadata.description,
        inLanguage: SITE.language,
        isPartOf: { '@id': `${SITE.origin}/#website` },
        hasPart: GUIDES.map((guide) => ({ '@id': `${absoluteUrl(`/rehber/${guide.slug}`)}#article` })),
      },
      {
        '@type': 'ItemList',
        '@id': `${pageUrl}#guides`,
        itemListElement: GUIDES.map((guide, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: guide.title,
          url: absoluteUrl(`/rehber/${guide.slug}`),
        })),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${pageUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Ana sayfa', item: absoluteUrl('/') },
          { '@type': 'ListItem', position: 2, name: 'Rehber', item: pageUrl },
        ],
      },
    ],
  };

  return (
    <main className="story-landing content-page">
      <JsonLd data={jsonLd} />
      <PublicContentNav />
      <header className="content-hero section-shell">
        <nav className="content-breadcrumb" aria-label="İçerik yolu"><ol><li><Link href="/">Ana sayfa</Link></li><li aria-current="page">Rehber</li></ol></nav>
        <span className="public-kicker"><PiBooks /> Calisiyo Rehber</span>
        <h1>YKS çalışma düzenini<br />adım adım kur.</h1>
        <p>Genel motivasyon cümleleri yerine uygulanabilir çalışma kararları. Program, konu, deneme ve süre kayıtlarını aynı düzen içinde nasıl kullanacağını açık örneklerle öğren.</p>
        <div className="content-hero-meta"><time dateTime={CONTENT_UPDATED_AT}>Son güncelleme: {formatEditorialDate(CONTENT_UPDATED_AT)}</time><span>{GUIDES.length} özgün rehber</span></div>
      </header>

      <section className="guide-hub-intro section-shell" aria-labelledby="rehber-yaklasim">
        <div><span>Yaklaşım</span><h2 id="rehber-yaklasim">Planı yazmakla uygulamak arasındaki boşluğu kapat.</h2></div>
        <div className="guide-principles">
          <p><PiCheckCircle /><span><strong>Gerçek kayıt</strong>Veri yoksa sonuç veya başarı oranı uydurulmaz.</span></p>
          <p><PiChartLineUp /><span><strong>Ölçülebilir karar</strong>Her öneri süre, görev, konu veya deneme çıktısına bağlanır.</span></p>
          <p><PiBooks /><span><strong>Tekrarlanabilir yöntem</strong>Bir kez okunup unutulacak öneriler yerine haftalık uygulanabilir adımlar kullanılır.</span></p>
        </div>
      </section>

      <section className="guide-list section-shell" aria-label="YKS çalışma rehberleri">
        {GUIDES.map((guide) => <GuideCard key={guide.slug} guide={guide} />)}
      </section>

      <section className="content-trust-band section-shell">
        <div><span>Şeffaf hesaplama</span><h2>Calisiyo verileri neyi gösterir, neyi göstermez?</h2><p>Çalışma süresi, seri, deneme neti ve program uyumu gibi göstergelerin hangi gerçek kayıtlardan oluştuğunu açıkça incele.</p></div>
        <Link className="public-button" href="/metodoloji">Metodolojiyi gör <PiArrowRight /></Link>
      </section>
      <section className="guide-feature-directory section-shell"><div><span>Rehberden ürüne</span><h2>Okuduğun yöntemi Calisiyo araçlarıyla uygula.</h2></div><Link className="public-button" href="/ozellikler">Tüm özellikleri incele <PiArrowRight /></Link></section>
      <PublicFooter />
    </main>
  );
}
