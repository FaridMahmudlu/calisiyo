import './globals.css';
import './public.css';
import './landing-editorial.css';
import AnalyticsConsentProvider from '@/components/analytics/AnalyticsConsentProvider';
import { JetBrains_Mono, Nunito_Sans } from 'next/font/google';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://calisiyo-theta.vercel.app';
const nunitoSans = Nunito_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-nunito-sans',
  display: 'swap',
});
const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'calisiyo · YKS Çalışma Koçu', template: '%s · calisiyo' },
  description: 'YKS çalışma planını oluştur, Kronometre ile çalış, konu ve deneme takibini gerçek çalışma kayıtlarınla tek yerde yönet.',
  keywords: ['YKS çalışma programı', 'YKS çalışma koçu', 'TYT çalışma programı', 'AYT çalışma programı', 'Kronometre', 'deneme analizi', 'konu takibi'],
  applicationName: 'calisiyo',
  category: 'education',
  creator: 'calisiyo',
  publisher: 'calisiyo',
  referrer: 'origin-when-cross-origin',
  formatDetection: { email: false, address: false, telephone: false },
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
    title: 'calisiyo · YKS Çalışma Koçu',
    description: 'Planını kur, odaklanarak çalış ve YKS ilerlemeni yalnızca kendi gerçek kayıtlarınla takip et.',
    url: SITE_URL,
    siteName: 'calisiyo',
    images: [{ url: '/brand/og-image.png', width: 1200, height: 630, alt: 'calisiyo YKS Çalışma Koçu' }],
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'calisiyo · YKS Çalışma Koçu',
    description: 'Planını kur, odaklanarak çalış ve YKS ilerlemeni yalnızca kendi gerçek kayıtlarınla takip et.',
    images: ['/brand/og-image.png'],
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION
      ? { 'msvalidate.01': process.env.BING_SITE_VERIFICATION }
      : undefined,
  },
};

export default function RootLayout({ children }) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: 'calisiyo',
        description: 'YKS çalışma planı, Kronometre, konu takibi, deneme analizi ve gerçek çalışma istatistikleri.',
        inLanguage: 'tr-TR',
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'calisiyo',
        url: SITE_URL,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/brand/calisiyo-mark-512.png`, width: 512, height: 512 },
        email: 'calisiyo.destek@gmail.com',
      },
    ],
  };

  return (
    <html lang="tr" className={`${nunitoSans.variable} ${jetBrainsMono.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#00a870" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      </head>
      <body><AnalyticsConsentProvider gaId={gaId}>{children}</AnalyticsConsentProvider></body>
    </html>
  );
}
