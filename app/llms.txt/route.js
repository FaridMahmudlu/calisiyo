import { SITE, absoluteUrl } from '@/lib/seo/site';

export const dynamic = 'force-static';

export function GET() {
  const text = `# ${SITE.displayName}

> ${SITE.displayName}, YKS hazırlığı için Türkçe çalışma planlama ve takip web uygulamasıdır.

## Temel bilgiler

- Ana sayfa: ${absoluteUrl('/')}
- Hakkımızda: ${absoluteUrl('/hakkimizda')}
- Özellikler: ${absoluteUrl('/ozellikler')}
- YKS çalışma rehberi: ${absoluteUrl('/rehber')}
- Veri metodolojisi: ${absoluteUrl('/metodoloji')}
- Paketler ve güncel fiyatlar: ${absoluteUrl('/paketler')}
- İletişim: ${absoluteUrl('/iletisim')}
- Destek: ${SITE.supportEmail}
- Dil: Türkçe
- Hedef sınavlar: TYT, AYT ve YDT

## Ürün kapsamı

- Günlük ve haftalık çalışma planı: ${absoluteUrl('/ozellikler/yks-planlama')}
- YouTube video ve oynatma listelerinden çalışma planı: ${absoluteUrl('/ozellikler/youtube-calisma-plani')}
- Kronometre ve doğrulanmış çalışma istatistikleri: ${absoluteUrl('/ozellikler/kronometre-ve-istatistikler')}
- TYT, AYT ve YDT deneme analizi: ${absoluteUrl('/ozellikler/deneme-analizi')}
- Konu ve açık tekrar planlama: ${absoluteUrl('/ozellikler/konu-takibi')}
- Gerçek zamanlı çalışma sınıfları: ${absoluteUrl('/ozellikler/calisma-siniflari')}

## Paket bilgisi

${SITE.displayName} ücretsiz ve sınav yılına göre seçilen Plus seçenekleri sunar. Fiyat, erişim dönemi, deneme ve yenileme bilgileri için güncel tek kaynak Paketler sayfasıdır: ${absoluteUrl('/paketler')}

## Doğruluk notu

${SITE.displayName} başarı oranı, puan, sıralama veya sınav sonucu garantisi vermez. Gelecek YKS günü ÖSYM tarafından resmen açıklanmadan belirli bir tarih yayımlanmaz. İstatistikler yalnızca kullanıcının kaydettiği doğrulanmış çalışma, soru, konu ve deneme verilerinden hesaplanır.

## Resmî sayfalar

- Gizlilik: ${absoluteUrl('/gizlilik')}
- KVKK: ${absoluteUrl('/kvkk')}
- Kullanım şartları: ${absoluteUrl('/kullanim-sartlari')}
- Çerez politikası: ${absoluteUrl('/cerez-politikasi')}
`;

  return new Response(text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
