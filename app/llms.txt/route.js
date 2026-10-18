import { SITE, absoluteUrl } from '@/lib/seo/site';
import { FAQS, SUPPORTED_EXAMS } from '@/components/landing/SharedLandingContent';

export const dynamic = 'force-static';

export function GET() {
  const faq = FAQS.map((item) => `### ${item.question}\n${item.answer}`).join('\n\n');
  const text = `# ${SITE.displayName}

> ${SITE.displayName}, YKS’ye ve okul sınavlarına hazırlanan öğrenciler için Türkçe çalışma planlama, kronometre ve deneme analizi uygulamasıdır. Web’de (${SITE.origin}) ve Android’de aynı hesapla çalışır.

## Temel bilgiler

- Resmî ad: ${SITE.displayName}
- Resmî alan adı: ${SITE.origin}
- Ana sayfa: ${absoluteUrl('/')}
- Hakkımızda: ${absoluteUrl('/hakkimizda')}
- Özellikler: ${absoluteUrl('/ozellikler')}
- YKS çalışma rehberi: ${absoluteUrl('/rehber')}
- Veri metodolojisi: ${absoluteUrl('/metodoloji')}
- Paketler ve güncel fiyatlar: ${absoluteUrl('/paketler')}
- İletişim: ${absoluteUrl('/iletisim')}
- Destek: ${SITE.supportEmail}
- Dil: Türkçe
- Desteklenen deneme türleri: ${SUPPORTED_EXAMS.join(', ')} ve kullanıcı tanımlı özel denemeler
- Mobil: Android uygulaması test aşamasında, yakında Google Play’de

## Ürün kapsamı

- Günlük ve haftalık çalışma planı: ${absoluteUrl('/ozellikler/yks-planlama')}
- Kronometre ve doğrulanmış çalışma istatistikleri: ${absoluteUrl('/ozellikler/kronometre-ve-istatistikler')}
- Çoklu sınav deneme analizi (TYT, AYT, YDT, KDS, SDS, LGS, KPSS, ALES, DGS, YDS, YÖKDİL, MSÜ): ${absoluteUrl('/ozellikler/deneme-analizi')}
- Konu takibi ve açık tekrar planlama: ${absoluteUrl('/ozellikler/konu-takibi')}
- YouTube video ve oynatma listelerinden çalışma planı: ${absoluteUrl('/ozellikler/youtube-calisma-plani')}
- Gerçek zamanlı çalışma sınıfları: ${absoluteUrl('/ozellikler/calisma-siniflari')}

## Net hesaplama kuralları

- YKS (TYT, AYT, YDT), KPSS, ALES, DGS ve MSÜ: net = doğru − yanlış / 4
- LGS: net = doğru − yanlış / 3
- YDS ve YÖKDİL: net = doğru (yanlış doğruyu götürmez)
- KDS, SDS ve özel denemeler: kullanıcı yanlış kuralını (4, 3 veya götürmez) ve ders bazında soru sayılarını seçer
- Boş sayısı = soru sayısı − doğru − yanlış; doğru ve yanlış toplamı soru sayısını aşamaz
- Farklı sınavlar genel görünümde başarı oranıyla (net / soru sayısı) karşılaştırılır; ham net gelişimi her sınavın kendi görünümünde gösterilir

## Paket bilgisi

${SITE.displayName} ücretsiz ve sınav yılına göre seçilen Plus seçenekleri sunar. Fiyat, erişim dönemi, deneme ve yenileme bilgileri için güncel tek kaynak Paketler sayfasıdır: ${absoluteUrl('/paketler')}

## Doğruluk notu

${SITE.displayName} başarı oranı, puan, sıralama veya sınav sonucu garantisi vermez. Gelecek YKS günü ÖSYM tarafından resmen açıklanmadan belirli bir tarih yayımlanmaz. İstatistikler yalnızca kullanıcının kaydettiği doğrulanmış çalışma, soru, konu ve deneme verilerinden hesaplanır.

## Sık sorulan sorular

${faq}

## Resmî sayfalar

- Gizlilik: ${absoluteUrl('/gizlilik')}
- KVKK: ${absoluteUrl('/kvkk')}
- Kullanım şartları: ${absoluteUrl('/kullanim-sartlari')}
- Çerez politikası: ${absoluteUrl('/cerez-politikasi')}
- Hesap silme: ${absoluteUrl('/hesap-silme')}
`;

  return new Response(text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
