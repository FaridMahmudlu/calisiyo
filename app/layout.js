import './globals.css';
import './public.css';
import './seo-content.css';
import AnalyticsConsentProvider from '@/components/analytics/AnalyticsConsentProvider';
import { JetBrains_Mono, Nunito_Sans } from 'next/font/google';
import { SITE } from '@/lib/seo/site';
import { THEME_BOOT_SCRIPT } from '@/lib/theme';

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
  metadataBase: new URL(SITE.origin),
  title: { default: SITE.productTitle, template: `%s · ${SITE.displayName}` },
  description: 'YKS çalışma planını oluştur, kronometreyle çalış; TYT, AYT, KDS, SDS, LGS ve KPSS denemelerini ve konu takibini gerçek çalışma kayıtlarınla tek yerde yönet.',
  keywords: ['YKS çalışma programı', 'YKS çalışma koçu', 'TYT çalışma programı', 'AYT çalışma programı', 'kronometre', 'deneme analizi', 'net hesaplama', 'KDS deneme takibi', 'SDS deneme analizi', 'LGS net hesaplama', 'KPSS deneme takibi', 'konu takibi'],
  applicationName: SITE.displayName,
  category: 'education',
  creator: SITE.displayName,
  publisher: SITE.displayName,
  referrer: 'origin-when-cross-origin',
  formatDetection: { email: false, address: false, telephone: false },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/brand/planliyo-monogram.svg', type: 'image/svg+xml' },
      { url: '/brand/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [{ url: '/brand/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: SITE.productTitle,
    description: 'Planını kur, odaklanarak çalış ve YKS ilerlemeni yalnızca kendi gerçek kayıtlarınla takip et.',
    url: SITE.origin,
    siteName: SITE.displayName,
    images: [{ url: SITE.socialImagePath, width: 1200, height: 630, alt: 'Planliyo YKS Çalışma Koçu' }],
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE.productTitle,
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
        '@id': `${SITE.origin}/#website`,
        url: SITE.origin,
        name: SITE.displayName,
        alternateName: SITE.visualName,
        description: 'YKS çalışma planı, Kronometre, konu takibi, deneme analizi ve gerçek çalışma istatistikleri.',
        inLanguage: 'tr-TR',
        publisher: { '@id': `${SITE.origin}/#organization` },
      },
      {
        '@type': 'Organization',
        '@id': `${SITE.origin}/#organization`,
        name: SITE.displayName,
        alternateName: SITE.visualName,
        url: SITE.origin,
        logo: { '@type': 'ImageObject', url: `${SITE.origin}${SITE.logoPath}`, width: 512, height: 512 },
        email: SITE.supportEmail,
        contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: SITE.supportEmail, availableLanguage: ['tr'] },
        ...(SITE.sameAs.length ? { sameAs: SITE.sameAs } : {}),
      },
    ],
  };

  return (
    <html lang="tr" className={`${nunitoSans.variable} ${jetBrainsMono.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#00a870" />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      </head>
      <body><AnalyticsConsentProvider gaId={gaId}>{children}</AnalyticsConsentProvider></body>
    </html>
  );
}
