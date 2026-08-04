import './globals.css';
import './public.css';

export const metadata = {
  title: 'calisiyo – YKS Çalışma Koçu',
  description: 'TYT, AYT ve YDT hazırlık sürecini günlük plan, konu takibi, deneme analizi ve çalışma araçlarıyla yönet.',
  keywords: 'YKS, TYT, AYT, YDT, çalışma programı, deneme analizi, konu takibi',
  applicationName: 'calisiyo',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/brand/calisiyo-mark.svg', type: 'image/svg+xml' },
      { url: '/brand/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [{ url: '/brand/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="theme-color" content="#00a870" />
      </head>
      <body>{children}</body>
    </html>
  );
}
