# Calisiyo SEO, AEO ve AI arama hazırlığı

Son doğrulama: 30 Ağustos 2026

## Tek canonical varlık kaynağı

Üretimdeki canonical origin `NEXT_PUBLIC_SITE_URL` değeridir. Özel alan adı yokken güvenli fallback `https://calisiyo-theta.vercel.app` olur. İsim, destek adresi, logo, sosyal görsel, canonical origin ve isteğe bağlı resmî sosyal hesaplar `lib/seo/site.js` üzerinden üretilir.

`NEXT_PUBLIC_OFFICIAL_SOCIAL_URLS`, yalnızca doğrulanmış HTTPS profil URL'lerinin virgülle ayrılmış listesi olmalıdır. Boşsa Organization şemasına yapay `sameAs` eklenmez.

Özel alan adı eklenirken:

1. Alan adı Vercel production domain olarak doğrulanmalı.
2. `NEXT_PUBLIC_SITE_URL=https://ornek-alan-adi.com` olarak production ortamında güncellenmeli.
3. Eski production host kalıcı olarak yeni domaine yönlendirilmeli; preview hostları yönlendirilmemeli.
4. Supabase auth callback, Shopier dönüş/webhook, Search Console ve Bing property URL'leri ayrıca güncellenmeli.
5. Deploy sonrası canonical, Open Graph, JSON-LD, robots, sitemap ve `llms.txt` aynı origin için kontrol edilmeli.

## İndekslenebilir içerik mimarisi

İndekslenebilir URL'lerin tek bakım listesi `lib/seo/content.js` içindeki `PUBLIC_INDEXABLE_ROUTES` kaynağıdır. Sitemap yalnızca canonical, public ve 200 dönen URL'leri içerir.

- Ana sayfa: dönüşüm ve ürünün kısa özeti.
- `/ozellikler`: ürün merkezi; detay verisi `lib/seo/features.js` içindedir.
- Altı özellik sayfası: YouTube planı, çalışma sınıfı, YKS planlama, Kronometre/istatistik, deneme analizi, konu takibi.
- `/rehber`: bilgi amacı taşıyan özgün rehberler; her rehber bir ürün özelliğine bağlanır.
- `/hakkimizda`, `/metodoloji`, `/paketler`, `/iletisim` ve yasal metinler: varlık, güven ve işlem sayfaları.
- Noindex: giriş, kayıt, parola ve hesap yardımcı akışları.
- Noindex + erişim kontrollü: dashboard ve admin.
- Noindex: API ve auth callback/hata yüzeyleri.

`robots.txt` erişim kontrolü değildir. Kullanıcı verisinin sınırı auth, sunucu yetkilendirmesi ve Supabase RLS olmaya devam eder.

## İçerik ve cannibalization politikası

Her yeni sayfa ayrı bir birincil kullanıcı niyetini çözmelidir. Özellik sayfası “ürün bunu nasıl yapar?” sorusuna; rehber ise “bu çalışma yöntemi nasıl uygulanır?” sorusuna yanıt verir. Aynı sorgu için yalnızca kelimeleri değiştirerek ikinci sayfa üretilmez.

Bir sayfa indekslenmeden önce:

- özgün, görünür ve sunucu HTML'inde bulunan bir doğrudan cevap sunmalı;
- tek H1, benzersiz title, description ve canonical kullanmalı;
- en az bir anlamlı giriş ve çıkış iç bağlantısı taşımalı;
- gerçek yayın/güncelleme tarihine sahip olmalı;
- ürün iddiaları çalışan kod yolu veya veri modeliyle doğrulanmalı;
- mobil taşma, internal 404, sitemap ve JSON-LD testlerinden geçmeli.

## Structured data politikası

- Site geneli: `WebSite`, `Organization`.
- Ana sayfa: görünür özelliklerle uyumlu `WebApplication`; görünür sorularla uyumlu `FAQPage`.
- Özellik merkezi: `CollectionPage`, `ItemList`, `BreadcrumbList`.
- Özellik detayları: `WebPage`, `BreadcrumbList`.
- Hakkımızda: `AboutPage`, `BreadcrumbList`, merkezi Organization referansı.
- Rehber merkezi: `CollectionPage`, `ItemList`, `BreadcrumbList`.
- Rehber yazıları: `Article`, `BreadcrumbList`.
- Metodoloji: `WebPage`, `BreadcrumbList`.

Rating, review, öğrenci sayısı, başarı oranı, ödül veya uzman yazar gibi doğrulanmamış alanlar eklenmez. JSON-LD görünür içerikten farklı iddiada bulunamaz. Google, FAQ rich result özelliğini 7 Mayıs 2026'da kaldırdı; görünür sorularla eşleşen mevcut FAQ şeması diğer tüketiciler için semantik kalabilir ancak Google sıralaması veya zengin sonuç garantisi değildir.

## AEO ve ürün doğruluğu

Özellik ve rehber sayfaları ilk bölümde kısa, doğal bir Türkçe yanıt verir; ardından adımlar, örnek, sınırlar ve ilgili sayfalar gelir. Sayfalar anahtar kelime listesi gibi değil, gerçek kullanıcı sorusuna yanıt verecek biçimde yazılır.

- Gelecek YKS günü yalnızca güncel ÖSYM kaynağıyla doğrulanır; resmen açıklanmayan tarih tahmin edilmez.
- Plus fiyatı, plan adı, deneme süresi ve erişim dönemi yalnızca `lib/billing/plans.js` üzerinden ürün sayfasına yansır.
- Editorial `dateModified` ve sitemap `lastModified`, gerçek anlamlı içerik değişikliğinde güncellenir; deploy tarihi otomatik yazılmaz.
- Deneme analizi puan veya sıralama tahmini yapmaz.
- İstatistikler veri yokken yapay sonuç üretmez.
- YouTube özelliği içerik doğruluğunu değerlendiren AI olarak tanıtılmaz.

## llms.txt ve AI crawler politikası

`/llms.txt`, `app/llms.txt/route.js` tarafından merkezi SITE origin ile oluşturulur. Google'ın AI arama rehberine göre özel bir AEO/GEO gerekliliği veya sıralama sinyali değildir; yalnızca stabil ürün özeti ve canonical kaynaklara yönlendirme sunar. Fiyat gibi değişken veriyi kopyalamaz, Paketler sayfasına bağlar.

Wildcard robots kuralı public sayfaları `OAI-SearchBot`, Googlebot ve Bingbot için açık tutar; private yollar aynı kuralda kapalıdır. `OAI-SearchBot` arama görünürlüğü, `GPTBot` eğitim tercihi ve ChatGPT-User kullanıcı isteğiyle erişim birbirinden farklı amaçlardır. Eğitim tercihi SEO kapsamı içinde otomatik değiştirilmez.

## IndexNow kullanımı

IndexNow uygulama runtime'ına bağlı değildir. Sahip tarafından gerektiğinde çalıştırılan yardımcı komut bulunur:

```powershell
$env:NEXT_PUBLIC_SITE_URL="https://alan-adiniz.com"
$env:INDEXNOW_KEY="urettiginiz-indexnow-anahtari"
npm run indexnow:submit -- --all
```

Belirli URL'ler için:

```powershell
npm run indexnow:submit -- / /ozellikler /rehber
```

Anahtar, `https://alan-adiniz.com/<INDEXNOW_KEY>.txt` konumunda düz metin olarak yayınlanmalı veya `INDEXNOW_KEY_LOCATION` ile aynı origin üzerindeki doğrulanmış konum belirtilmelidir. Anahtar repoya yazılmaz. Script yalnızca HTTPS ve aynı origin URL'lerini kabul eder; eksik yapılandırmada güvenli biçimde işlem yapmadan çıkar.

## Search Console ve Bing sahibi adımları

Google Search Console:

1. Canonical production property'yi doğrula ve `/sitemap.xml` gönder.
2. Ana sayfa, `/ozellikler`, `/rehber`, `/paketler` ve önemli yeni sayfaları URL Inspection ile kontrol et.
3. Canonical seçimi, Page Indexing ve Core Web Vitals raporlarını izle.
4. Sorguları marka, planlama, deneme, konu, YouTube ve birlikte çalışma kümeleriyle değerlendir.
5. Birkaç günlük veriden kalıcı sıralama sonucu çıkarma.

Bing Webmaster Tools:

1. Canonical siteyi ve sitemap'i doğrula.
2. Site Scan, URL Inspection ve Search Performance sorunlarını incele.
3. Yeni veya anlamlı biçimde güncellenen public URL'leri gerektiğinde IndexNow ile gönder.

Yapısal veri Google Rich Results Test ve Schema.org Validator ile kontrol edilebilir. Geçerli schema, rich result veya ilk sıra garantisi vermez.

## Ölçüm, performans ve dış otorite

Analytics yalnızca mevcut izin mimarisi içinde çalışır. ChatGPT yönlendirmeleri izin verilmiş analytics aracında UTM/referrer üzerinden incelenebilir; fingerprinting veya izinsiz takip eklenmez.

Teknik SEO tek başına otorite yaratmaz. Ürün sahibi; doğrulanabilir kullanıcı geri bildirimi, özgün çalışma verisi araştırmaları, eğitim topluluklarıyla gerçek iş birlikleri ve kaliteli kaynaklardan doğal bağlantılar üretmelidir. Yapay backlink, satın alınmış değerlendirme veya sahte sosyal kanıt kullanılmamalıdır.

## Manuel ürün sahibi aksiyonları

Kod deposu dışında tamamlanması gerekenler:

1. Markalı alan adını satın al, Vercel'e bağla ve `NEXT_PUBLIC_SITE_URL` değerini güncelle.
2. Yeni canonical property'yi Google Search Console ve Bing Webmaster Tools içinde doğrula; sitemap'i iki platforma da gönder.
3. Ana sayfa, Özellikler, Rehber ve Paketler gibi öncelikli URL'leri incele; indeksleme ve Core Web Vitals durumunu zaman içinde izle.
4. IndexNow kullanılacaksa anahtar üret, aynı origin üzerinde anahtar dosyasını yayınla ve yalnızca anlamlı değişikliklerden sonra bildirim gönder.
5. Otterly veya kullanılan başka izleme aracındaki marka adını “Calisiyo” yap; Türkçe/Türkiye odaklı gerçek kullanıcı sorularını takip et.
6. Yalnızca gerçekten Calisiyo'ya ait sosyal profil URL'lerini `NEXT_PUBLIC_OFFICIAL_SOCIAL_URLS` içine ekle.
7. Gerçek eğitim üreticileri, öğretmenler ve topluluklarla doğrulanabilir iş birlikleri kur; sahte bağlantı, yorum veya atıf üretme.
8. Google, Bing ve ChatGPT kaynaklı organik görünürlük/atıfları düzenli aralıklarla izle. Hiçbir teknik değişiklik sıralama veya atıf garantisi vermez.

## Doğrulama komutları

```powershell
npm run lint
npm run build
npx playwright test tests/seo-search-readiness.spec.js
```

Playwright paketi; canonical origin tutarlılığı, tek H1, metadata benzersizliği, JSON-LD parse, public sitemap seti, private noindex, bot içerik eşitliği, `llms.txt`, iç bağlantılar ve 390×844 mobil taşmayı kontrol eder.

## Birincil kaynaklar

- Google Search Central: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- Google sitemap kılavuzu: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Google structured data politikaları: https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- OpenAI yayıncı ve geliştirici SSS: https://help.openai.com/en/articles/12627856-publishers-and-developers-faq
- IndexNow protokolü: https://www.indexnow.org/documentation
- Bing Webmaster Guidelines: https://www.bing.com/webmasters/help/bing-webmaster-guidelines-30fba23a
- ÖSYM Sınav Takvimi: https://www.osym.gov.tr/Sayfa/SinavTakvimi/tr-TR
