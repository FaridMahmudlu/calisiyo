import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PiArrowRight, PiCheck, PiInfo } from 'react-icons/pi';
import PublicContentNav from '@/components/landing/PublicContentNav';
import PublicFooter from '@/components/landing/PublicFooter';
import JsonLd from '@/components/seo/JsonLd';
import { GUIDE_BY_SLUG } from '@/lib/seo/content';
import { FEATURE_BY_SLUG, FEATURES } from '@/lib/seo/features';
import { absoluteUrl, SITE } from '@/lib/seo/site';

export function generateStaticParams() { return FEATURES.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }) {
  const feature = FEATURE_BY_SLUG[(await params).slug];
  if (!feature) return {};
  return {
    title: feature.title,
    description: feature.description,
    alternates: { canonical: `/ozellikler/${feature.slug}` },
    openGraph: { title: feature.title, description: feature.description, url: `/ozellikler/${feature.slug}` },
  };
}

export default async function FeaturePage({ params }) {
  const feature = FEATURE_BY_SLUG[(await params).slug];
  if (!feature) notFound();
  const related = FEATURE_BY_SLUG[feature.relatedFeature];
  const guide = GUIDE_BY_SLUG[feature.relatedGuide];
  const pageUrl = absoluteUrl(`/ozellikler/${feature.slug}`);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', '@id': pageUrl, url: pageUrl, name: feature.title, description: feature.description, inLanguage: SITE.language, isPartOf: { '@id': `${SITE.origin}/#website` }, about: { '@id': `${SITE.origin}/#organization` } },
      { '@type': 'BreadcrumbList', '@id': `${pageUrl}#breadcrumb`, itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Ana sayfa', item: absoluteUrl('/') }, { '@type': 'ListItem', position: 2, name: 'Özellikler', item: absoluteUrl('/ozellikler') }, { '@type': 'ListItem', position: 3, name: feature.shortTitle, item: pageUrl }] },
    ],
  };

  return (
    <main className="story-landing content-page feature-page">
      <JsonLd data={jsonLd} />
      <PublicContentNav />
      <article className="feature-detail section-shell">
        <header className="feature-detail-header">
          <nav className="content-breadcrumb" aria-label="İçerik yolu"><ol><li><Link href="/">Ana sayfa</Link></li><li><Link href="/ozellikler">Özellikler</Link></li><li aria-current="page">{feature.shortTitle}</li></ol></nav>
          <span className="public-kicker">{feature.kicker}</span>
          <h1>{feature.title}</h1>
          <p>{feature.description}</p>
          <div className="feature-detail-actions"><Link className="public-button primary" href="/kayit">Ücretsiz başla <PiArrowRight /></Link><Link className="public-button" href="/paketler">Paketleri karşılaştır</Link></div>
        </header>

        <section className="feature-answer" aria-labelledby="kisa-cevap"><span>Kısa cevap</span><h2 id="kisa-cevap">Bu özellik ne yapar?</h2><p>{feature.answer}</p></section>

        <section className="feature-highlights" aria-labelledby="one-cikanlar">
          <div><span>Kimler için?</span><h2 id="one-cikanlar">Çalışma düzenindeki karşılığı</h2><p>{feature.audience}</p></div>
          <ul>{feature.highlights.map((item) => <li key={item}><PiCheck />{item}</li>)}</ul>
        </section>

        <section className="feature-steps" aria-labelledby="nasil-kullanilir"><span>Adım adım</span><h2 id="nasil-kullanilir">Nasıl kullanılır?</h2><ol>{feature.steps.map(([number, title, text]) => <li key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol></section>

        <section className="feature-example" aria-labelledby="ornek"><div><span>Gerçek senaryo</span><h2 id="ornek">{feature.example.title}</h2></div><p>{feature.example.text}</p></section>

        <section className="feature-limits" aria-labelledby="sinirlar"><div><PiInfo /><span><strong id="sinirlar">Bilmen gereken sınırlar</strong>Özelliğin ne yapmadığını da açıkça gösteriyoruz.</span></div><ul>{feature.limits.map((limit) => <li key={limit}>{limit}</li>)}</ul></section>

        <aside className="feature-related">
          {guide && <div><span>Uygulama rehberi</span><h2>{guide.title}</h2><p>{guide.summary}</p><Link href={`/rehber/${guide.slug}`}>Rehberi oku <PiArrowRight /></Link></div>}
          {related && <div><span>Birlikte kullan</span><h2>{related.shortTitle}</h2><p>{related.description}</p><Link href={`/ozellikler/${related.slug}`}>Özelliği incele <PiArrowRight /></Link></div>}
        </aside>
      </article>
      <PublicFooter />
    </main>
  );
}
