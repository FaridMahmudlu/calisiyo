import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PiArrowRight, PiCheck, PiInfo, PiLink } from 'react-icons/pi';
import PublicContentNav from '@/components/landing/PublicContentNav';
import PublicFooter from '@/components/landing/PublicFooter';
import GuideCard from '@/components/seo/GuideCard';
import JsonLd from '@/components/seo/JsonLd';
import { formatEditorialDate, GUIDE_BY_SLUG, GUIDES } from '@/lib/seo/content';
import { absoluteUrl, SITE } from '@/lib/seo/site';

export function generateStaticParams() {
  return GUIDES.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const guide = GUIDE_BY_SLUG[slug];
  if (!guide) return {};

  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/rehber/${guide.slug}` },
    openGraph: {
      title: `${guide.title} · calisiyo`,
      description: guide.description,
      url: `/rehber/${guide.slug}`,
      type: 'article',
      publishedTime: guide.publishedAt,
      modifiedTime: guide.updatedAt,
    },
  };
}

function GuideSection({ section, index }) {
  return (
    <section className="guide-section" aria-labelledby={`bolum-${index}`}>
      <h2 id={`bolum-${index}`}>{section.title}</h2>
      {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      {section.steps && <ol className="guide-steps">{section.steps.map(([number, title, text]) => <li key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol>}
      {section.checklist && <ul className="guide-checklist">{section.checklist.map((item) => <li key={item}><PiCheck />{item}</li>)}</ul>}
      {section.table && <div className="guide-table-wrap"><table><thead><tr>{section.table.headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead><tbody>{section.table.rows.map((row) => <tr key={row.join('-')}>{row.map((cell, cellIndex) => <td key={cell} data-label={section.table.headers[cellIndex]}>{cell}</td>)}</tr>)}</tbody></table></div>}
      {section.callout && <aside className="guide-callout"><PiInfo /><p>{section.callout}</p></aside>}
    </section>
  );
}

export default async function GuidePage({ params }) {
  const { slug } = await params;
  const guide = GUIDE_BY_SLUG[slug];
  if (!guide) notFound();

  const pageUrl = absoluteUrl(`/rehber/${guide.slug}`);
  const related = guide.related.map((item) => GUIDE_BY_SLUG[item]).filter(Boolean);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': `${pageUrl}#article`,
        headline: guide.title,
        description: guide.description,
        datePublished: guide.publishedAt,
        dateModified: guide.updatedAt,
        inLanguage: SITE.language,
        mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
        author: { '@id': `${SITE.origin}/#organization` },
        publisher: { '@id': `${SITE.origin}/#organization` },
        isPartOf: { '@id': `${absoluteUrl('/rehber')}#collection` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${pageUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Ana sayfa', item: absoluteUrl('/') },
          { '@type': 'ListItem', position: 2, name: 'Rehber', item: absoluteUrl('/rehber') },
          { '@type': 'ListItem', position: 3, name: guide.title, item: pageUrl },
        ],
      },
    ],
  };

  return (
    <main className="story-landing content-page">
      <JsonLd data={jsonLd} />
      <PublicContentNav />
      <article className="guide-article section-shell">
        <header className="guide-article-header">
          <nav className="content-breadcrumb" aria-label="İçerik yolu"><ol><li><Link href="/">Ana sayfa</Link></li><li><Link href="/rehber">Rehber</Link></li><li aria-current="page">{guide.title}</li></ol></nav>
          <span className="public-kicker">{guide.kicker}</span>
          <h1>{guide.title}</h1>
          <p className="guide-lead">{guide.summary}</p>
          <div className="content-hero-meta"><span>Calisiyo editoryal</span><time dateTime={guide.updatedAt}>Güncellendi: {formatEditorialDate(guide.updatedAt)}</time></div>
        </header>

        <div className="guide-article-layout">
          <aside className="guide-toc" aria-label="Bu rehberde"><strong>Bu rehberde</strong>{guide.sections.map((section, index) => <a key={section.title} href={`#bolum-${index}`}>{section.title}</a>)}</aside>
          <div className="guide-article-body">
            <section className="guide-direct-answer" aria-label="Kısa cevap"><span>Kısa cevap</span><p>{guide.answer}</p></section>
            {guide.sections.map((section, index) => <GuideSection key={section.title} section={section} index={index} />)}

            {guide.sources.length > 0 && <section className="guide-sources" aria-labelledby="kaynaklar"><h2 id="kaynaklar">Resmî kaynak</h2>{guide.sources.map((source) => <p key={source.href}><PiLink /><span><a href={source.href} target="_blank" rel="noopener noreferrer">{source.label}</a><small>{source.note}</small></span></p>)}</section>}

            <aside className="guide-cta"><div><span>Uygulamaya geçir</span><h2>Okuduğun yöntemi kendi çalışma düzenine taşı.</h2><p>Ücretsiz hesapla plan, konu, deneme ve çalışma kayıtlarını tek yerde yönetmeye başlayabilirsin.</p></div><Link className="public-button primary" href={guide.cta.href}>{guide.cta.label} <PiArrowRight /></Link></aside>
          </div>
        </div>
      </article>

      <section className="related-guides section-shell" aria-labelledby="ilgili-rehberler"><header><span>Sonraki adım</span><h2 id="ilgili-rehberler">İlgili rehberler</h2></header><div>{related.map((item) => <GuideCard key={item.slug} guide={item} />)}</div></section>
      <PublicFooter />
    </main>
  );
}
