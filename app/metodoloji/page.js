import Link from 'next/link';
import { PiArrowRight, PiChartLineUp, PiCheck, PiClock, PiShieldCheck, PiTarget } from 'react-icons/pi';
import PublicContentNav from '@/components/landing/PublicContentNav';
import PublicFooter from '@/components/landing/PublicFooter';
import JsonLd from '@/components/seo/JsonLd';
import { CONTENT_UPDATED_AT, formatEditorialDate } from '@/lib/seo/content';
import { absoluteUrl, SITE } from '@/lib/seo/site';

export const metadata = {
  title: 'Çalışma Verisi Metodolojisi',
  description: 'Calisiyo çalışma süresi, seri, program uyumu ve deneme neti göstergelerinin gerçek kullanıcı kayıtlarından nasıl oluştuğunu öğren.',
  alternates: { canonical: '/metodoloji' },
  openGraph: {
    title: 'Çalışma Verisi Metodolojisi · calisiyo',
    description: 'Calisiyo göstergelerinin neyi ölçtüğünü, neyi ölçmediğini ve hangi gerçek kayıtlara dayandığını açıkça incele.',
    url: '/metodoloji',
  },
};

const principles = [
  [PiClock, 'Doğrulanmış çalışma süresi', 'Manuel çalışma, tamamlanan planlı görev ve Kronometre kayıtları ortak hesaplama düzeninde değerlendirilir. Aynı çalışmayı temsil eden kayıtlar iki kez toplanmaz.'],
  [PiTarget, 'Günlük seri', 'Europe/Istanbul gün sınırına göre en az 30 dakikalık doğrulanmış çalışma etkinliği bulunan günler seri koşulunu karşılar.'],
  [PiChartLineUp, 'Program uyumu', 'Seçilen dönemdeki planlı görevlerin tamamlanma oranıdır. Görev yoksa yanıltıcı bir başarı yüzdesi üretilmez.'],
  [PiCheck, 'Deneme neti', 'Her ders için net, doğru − yanlış/4 formülüyle hesaplanır. Bilinen soru sayısında boş sayısı doğru ve yanlıştan türetilir.'],
];

export default function MethodologyPage() {
  const pageUrl = absoluteUrl('/metodoloji');
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': pageUrl,
        url: pageUrl,
        name: 'Calisiyo Çalışma Verisi Metodolojisi',
        description: metadata.description,
        dateModified: CONTENT_UPDATED_AT,
        inLanguage: SITE.language,
        isPartOf: { '@id': `${SITE.origin}/#website` },
        about: { '@id': `${SITE.origin}/#application` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${pageUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Ana sayfa', item: absoluteUrl('/') },
          { '@type': 'ListItem', position: 2, name: 'Metodoloji', item: pageUrl },
        ],
      },
    ],
  };

  return (
    <main className="story-landing content-page">
      <JsonLd data={jsonLd} />
      <PublicContentNav />
      <header className="content-hero methodology-hero section-shell">
        <nav className="content-breadcrumb" aria-label="İçerik yolu"><ol><li><Link href="/">Ana sayfa</Link></li><li aria-current="page">Metodoloji</li></ol></nav>
        <span className="public-kicker"><PiShieldCheck /> Şeffaf veri yaklaşımı</span>
        <h1>İlerleme, yalnızca<br />gerçek kayıttan oluşur.</h1>
        <p>Calisiyo çalışma başarısı uydurmaz ve kayıt olmayan bir günü dolu göstermez. Bu sayfa, kullanıcıya gösterilen temel göstergelerin nasıl yorumlandığını açıklar.</p>
        <div className="content-hero-meta"><time dateTime={CONTENT_UPDATED_AT}>Son güncelleme: {formatEditorialDate(CONTENT_UPDATED_AT)}</time><span>Europe/Istanbul gün sınırı</span></div>
      </header>

      <section className="methodology-grid section-shell" aria-label="Hesaplama ilkeleri">
        {principles.map(([Icon, title, text]) => <article key={title}><Icon /><h2>{title}</h2><p>{text}</p></article>)}
      </section>

      <section className="methodology-detail section-shell">
        <div><span>Neyi gösterir?</span><h2>Kendi çalışma davranışının kaydını.</h2><p>Toplam ve günlük çalışma süresi, soru kayıtları, konu durumları, planlanan görevler ve deneme sonuçları yalnızca ilgili hesabın verilerinden oluşur. İstatistik aralığı değiştiğinde gösterilen değerler de aynı tarih aralığına göre hesaplanır.</p></div>
        <div><span>Neyi göstermez?</span><h2>Başarı garantisi veya resmî sınav tahmini değil.</h2><p>Calisiyo sıralama, puan ya da YKS başarısı garantisi vermez. Gelecek sınav günleri ÖSYM tarafından resmen açıklanmadan belirli bir tarih yayımlanmaz. Çalışma kayıtları karar vermeye yardım eder; öğrencinin öğrenme düzeyini tek başına kanıtlamaz.</p></div>
        <div><span>Veri yoksa</span><h2>Sıfır, bilinmeyen anlamına gelebilir.</h2><p>Henüz çalışma veya deneme kaydı olmayan ekranda sahte örnek oranlar yerine açık bir boş durum gösterilir. Bir grafik ancak karşılaştırmaya yetecek gerçek kayıt bulunduğunda anlam kazanır.</p></div>
      </section>

      <section className="content-trust-band section-shell"><div><span>Pratiğe geç</span><h2>Veriyi üretmenin ilk adımı uygulanabilir bir plandır.</h2><p>Günlük ve haftalık görevlerini nasıl aynı düzende kuracağını YKS çalışma programı rehberinde gör.</p></div><Link className="public-button" href="/rehber/yks-calisma-programi">Program rehberini oku <PiArrowRight /></Link></section>
      <PublicFooter />
    </main>
  );
}
