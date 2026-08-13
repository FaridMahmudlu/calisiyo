import './globals.css';
import './public.css';
import './landing-3d.css';
import AnalyticsConsentProvider from '@/components/analytics/AnalyticsConsentProvider';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://calisiyo-theta.vercel.app'),
  title: 'calisiyo – YKS Çalışma Koçu',
  description: 'TYT, AYT ve YDT hazırlık sürecini günlük plan, konu takibi, deneme analizi ve çalışma araçlarıyla yönet.',
  keywords: 'YKS, TYT, AYT, YDT, çalışma programı, deneme analizi, konu takibi',
  applicationName: 'calisiyo',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/brand/calisiyo-monogram.svg', type: 'image/svg+xml' },
      { url: '/brand/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [{ url: '/brand/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'calisiyo – YKS Çalışma Koçu',
    description: 'TYT, AYT ve YDT hazırlık sürecini günlük plan, konu takibi, deneme analizi ve çalışma araçlarıyla yönet.',
    url: 'https://calisiyo-theta.vercel.app',
    siteName: 'calisiyo',
    images: [
      {
        url: '/brand/og-image.png',
        width: 1200,
        height: 630,
        alt: 'calisiyo – YKS Çalışma Koçu Wordmark Logo',
      },
    ],
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'calisiyo – YKS Çalışma Koçu',
    description: 'TYT, AYT ve YDT hazırlık sürecini günlük plan, konu takibi, deneme analizi ve çalışma araçlarıyla yönet.',
    images: ['/brand/og-image.png'],
  },
};

export default function RootLayout({ children }) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://calisiyo-theta.vercel.app';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        'url': baseUrl,
        'name': 'calisiyo',
        'description': 'YKS hazırlığını net bir çalışma yoluna dönüştür.',
        'inLanguage': 'tr-TR',
      },
      {
        '@type': 'Organization',
        '@id': `${baseUrl}/#organization`,
        'name': 'calisiyo',
        'url': baseUrl,
        'logo': `${baseUrl}/brand/calisiyo-logo.svg`,
        'sameAs': [],
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${baseUrl}/#application`,
        'name': 'calisiyo – YKS Çalışma Koçu',
        'operatingSystem': 'Web',
        'applicationCategory': 'EducationalApplication',
        'offers': [
          { '@type': 'Offer', 'name': 'Başlangıç', 'price': '0', 'priceCurrency': 'TRY' },
          { '@type': 'Offer', 'name': 'Odak 30 gün', 'price': '89.90', 'priceCurrency': 'TRY' },
          { '@type': 'Offer', 'name': 'Zirve 30 gün', 'price': '149.90', 'priceCurrency': 'TRY' },
        ],
      },
    ],
  };

  return (
    <html lang="tr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="theme-color" content="#00a870" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <AnalyticsConsentProvider gaId={gaId}>
          {children}
        </AnalyticsConsentProvider>
      </body>
    </html>
  );
}
