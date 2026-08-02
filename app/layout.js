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
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>{children}</body>
    </html>
  );
}
