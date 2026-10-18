import LandingPage from '@/components/landing/LandingPage';
import { FAQS, SUPPORTED_EXAMS } from '@/components/landing/SharedLandingContent';
import { PLUS_VARIANTS, PUBLIC_PLANS } from '@/lib/billing/plans';
import { SITE } from '@/lib/seo/site';
import './landing.css';

const TITLE = 'YKS Çalışma Programı, Kronometre ve Deneme Analizi · Planliyo';
const DESCRIPTION = 'YKS çalışma programını kur, kronometreyle çalış; TYT, AYT, KDS, SDS, LGS ve KPSS denemelerinin netlerini birlikte ve ders bazında ayrı ayrı analiz et. Ücretsiz başla.';

export const metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  openGraph: {
    title: TITLE,
    description: 'Planını kur, kronometreyle çalış ve YKS’den okul sınavlarına kadar tüm denemelerini gerçek verilerle takip et.',
    url: '/',
  },
};

export default function HomePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${SITE.origin}/#webpage`,
        url: SITE.origin,
        name: TITLE,
        description: DESCRIPTION,
        inLanguage: 'tr-TR',
        isPartOf: { '@id': `${SITE.origin}/#website` },
        about: { '@id': `${SITE.origin}/#application` },
        primaryImageOfPage: { '@type': 'ImageObject', url: `${SITE.origin}${SITE.socialImagePath}` },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${SITE.origin}/#application`,
        name: SITE.displayName,
        alternateName: ['Planliyo YKS Çalışma Koçu', 'Calisiyo'],
        url: SITE.origin,
        description: 'YKS çalışma planı, kronometre, konu ve tekrar takibi, çoklu sınav deneme analizi ve gerçek çalışma istatistiklerini bir araya getiren çalışma planlama uygulaması.',
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Web, Android',
        inLanguage: 'tr-TR',
        audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'YKS, LGS ve KPSS adayları ile lise öğrencileri' },
        featureList: [
          'Günlük ve haftalık YKS çalışma planı',
          'Kronometre ve çalışma süresi kaydı',
          'TYT, AYT ve YDT konu takibi ve tekrar planı',
          `${SUPPORTED_EXAMS.join(', ')} deneme analizi`,
          'Tüm sınavları birlikte ve ders bazında ayrı ayrı karşılaştıran net grafikleri',
          'Gerçek çalışma kayıtlarından istatistikler ve seviye sistemi',
          'YouTube oynatma listelerinden çalışma planı',
          'Gerçek zamanlı çalışma sınıfları, ortak odak, tahta ve sohbet',
        ],
        offers: [PUBLIC_PLANS[0], ...PLUS_VARIANTS].map((plan) => ({
          '@type': 'Offer',
          name: `${plan.name || `planliyo plus · ${plan.label}`} planı`,
          price: String(plan.price || 0),
          priceCurrency: 'TRY',
          url: `${SITE.origin}/paketler`,
          availability: 'https://schema.org/InStock',
        })),
        publisher: { '@id': `${SITE.origin}/#organization` },
      },
      {
        '@type': 'FAQPage',
        '@id': `${SITE.origin}/#faq`,
        mainEntity: FAQS.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
      {
        '@type': 'HowTo',
        '@id': `${SITE.origin}/#nasil-calisir`,
        name: 'Planliyo ile YKS çalışma düzeni nasıl kurulur?',
        inLanguage: 'tr-TR',
        step: [
          { '@type': 'HowToStep', position: 1, name: 'Alanını ve sınav yılını seç', text: 'Sayısal, eşit ağırlık, sözel veya dil alanını ve YKS 2027 ya da 2028 yılını seç; dersler ve konular buna göre gelir.' },
          { '@type': 'HowToStep', position: 2, name: 'Gününü planla ve kronometreyle çalış', text: 'Görevini ders, konu, süre ve soru hedefiyle ekle; kronometreyi başlat, süre ve soru sayısı kaydedilsin.' },
          { '@type': 'HowToStep', position: 3, name: 'Denemelerini gir ve analiz et', text: 'TYT, AYT, KDS, SDS veya diğer denemelerinin doğru ve yanlışlarını gir; netleri, başarı oranını ve ders bazında gelişimi gör.' },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <LandingPage />
    </>
  );
}
