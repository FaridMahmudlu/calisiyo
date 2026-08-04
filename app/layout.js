import './globals.css';

export const metadata = {
  title: 'calisiyo – YKS Çalışma Koçu',
  description: 'TYT, AYT ve YDT hazırlık sürecini tek bir platform üzerinden yönet. Günlük program, deneme analizi, konu takibi ve daha fazlası.',
  keywords: 'YKS, TYT, AYT, YDT, çalışma programı, deneme analizi, konu takibi',
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="theme-color" content="#10b981" />
      </head>
      <body>{children}</body>
    </html>
  );
}
