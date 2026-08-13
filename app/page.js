import LandingPageNew from '@/components/landing/LandingPageNew';
import { FAQS } from '@/components/landing/SharedLandingContent';
import { PUBLIC_PLANS } from '@/lib/billing/plans';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://calisiyo-theta.vercel.app';

export const metadata = {
  title: { absolute: 'YKS Çalışma Programı ve Koçu · calisiyo' },
  description: 'YKS çalışma programını oluştur; Pomodoro, konu takibi, deneme analizi ve gerçek çalışma istatistiklerini Calisiyo ile tek yerde yönet.',
  alternates: { canonical: '/' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  openGraph: {
    title: 'YKS Çalışma Programı ve Koçu · calisiyo',
    description: 'Planını kur, Pomodoro ile odaklan ve YKS ilerlemeni gerçek çalışma kayıtlarınla takip et.',
    url: '/',
  },
};

export default function HomePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': `${SITE_URL}/#application`,
        name: 'calisiyo · YKS Çalışma Koçu',
        url: SITE_URL,
        description: 'YKS çalışma planı, Pomodoro, konu ve tekrar takibi, deneme analizi ve gerçek çalışma istatistiklerini bir araya getiren web uygulaması.',
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Web',
        browserRequirements: 'Modern web tarayıcısı ve internet bağlantısı',
        inLanguage: 'tr-TR',
        featureList: [
          'Günlük ve haftalık YKS çalışma planı',
          'Pomodoro ve çalışma süresi kaydı',
          'TYT, AYT ve YDT konu takibi',
          'Deneme analizi ve net karşılaştırması',
          'Gerçek çalışma kayıtlarından istatistikler',
          'Çalışma sınıfları',
        ],
        offers: PUBLIC_PLANS.map((plan) => ({
          '@type': 'Offer',
          name: `${plan.name} planı`,
          price: String(plan.monthlyPrice),
          priceCurrency: 'TRY',
          url: `${SITE_URL}/paketler`,
          availability: plan.code === 'baslangic' ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
        })),
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
      {
        '@type': 'FAQPage',
        '@id': `${SITE_URL}/#faq`,
        mainEntity: FAQS.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <LandingPageNew />
    </>
  );
}
