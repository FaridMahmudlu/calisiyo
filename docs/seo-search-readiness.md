# Calisiyo SEO ve AI Arama Hazırlığı

Son doğrulama: 27 Ağustos 2026

## Canonical alan adı

Üretimdeki güncel canonical origin `NEXT_PUBLIC_SITE_URL` değeridir. Özel alan adı bulunmadığı sürece güvenli fallback `https://calisiyo-theta.vercel.app` olur. Metadata, JSON-LD, robots ve sitemap URL'leri `lib/seo/site.js` üzerinden üretilir.

Branded bir alan adı eklendiğinde:

1. Vercel production domain olarak eklenmeli.
2. `NEXT_PUBLIC_SITE_URL` yeni origin ile güncellenmeli.
3. Eski production host yalnızca production ortamında kalıcı olarak yeni domaine yönlendirilmeli; preview, auth callback ve Shopier webhook URL'leri ayrıca doğrulanmalı.

## İndeksleme politikası

İndekslenebilir yüzeyler `lib/seo/content.js` içindeki `PUBLIC_INDEXABLE_ROUTES` kaynağında tutulur. Sitemap yalnızca bu canonical, public ve 200 dönen URL'leri içerir.

- İndekslenebilir: ana sayfa, paketler, rehber ve rehber yazıları, metodoloji, iletişim ve yasal metinler.
- Noindex: giriş, kayıt, parola ve hesap yardımcı akışları.
- Noindex + erişim kontrollü: dashboard ve admin.
- Noindex: API ve auth callback/hata yüzeyleri.

`robots.txt` erişim kontrolü değildir. Kullanıcı verisinin sınırı auth, sunucu yetkilendirmesi ve RLS olmaya devam eder.

## Structured data politikası

- Site geneli: `WebSite`, `Organization`.
- Ana sayfa: görünür ürün özellikleriyle uyumlu `WebApplication`; görünür sorularla uyumlu `FAQPage`.
- Rehber merkezi: `CollectionPage`, `ItemList`, `BreadcrumbList`.
- Rehber yazıları: `Article`, `BreadcrumbList`.
- Metodoloji: `WebPage`, `BreadcrumbList`.

Rating, review, öğrenci sayısı, başarı oranı veya uzman yazar gibi doğrulanmamış alanlar eklenmez. JSON-LD görünür içerikten farklı iddiada bulunamaz.

## Tarih ve ürün bilgisi

- YKS günü yalnızca güncel ÖSYM kaynağıyla doğrulanır. Resmen açıklanmayan gelecek tarih tahmin edilmez.
- Plus fiyatı, plan adı, deneme süresi ve erişim dönemi yalnızca `lib/billing/plans.js` üzerinden ürün sayfasına yansır.
- Editorial `dateModified` ve sitemap `lastModified`, gerçek anlamlı içerik değişikliğinde elle güncellenir; deploy tarihi otomatik yazılmaz.
- `llms.txt` Google sıralama sinyali olarak kabul edilmez. Yalnızca stabil ürün özeti ve canonical sayfalara yönlendirme içerir.

## AI crawler politikası

Wildcard robots kuralı public sayfaları `OAI-SearchBot`, Googlebot ve Bingbot için açık tutar; private yollar aynı kuralda kapalıdır. `GPTBot` eğitim tercihi ayrı bir site sahibi kararıdır ve SEO değişiklikleri kapsamında değiştirilmez.

## Yeni rehber yayınlama kontrolü

Bir sayfa indekslenmeden önce:

- ayrı ve belgelenmiş bir kullanıcı niyeti olmalı;
- özgün, uygulanabilir ve görünür HTML içeriği bulunmalı;
- title, tek H1, description ve canonical benzersiz olmalı;
- yayın/güncelleme tarihleri gerçek olmalı;
- değişken sınav bilgileri için resmî kaynak kullanılmalı;
- en az bir anlamlı dahili giriş ve çıkış bağlantısı bulunmalı;
- mevcut bir sayfayla aynı birincil sorgu için yarışmamalı;
- mobil taşma, internal 404 ve JSON-LD parse testleri geçmeli.

## Search Console ve Bing sahibi adımları

Google Search Console:

1. Canonical production property'yi doğrula.
2. `/sitemap.xml` gönder.
3. `/`, `/paketler`, `/rehber` ve ana rehber URL'lerini URL Inspection ile kontrol et.
4. Canonical seçimi, Page Indexing ve Core Web Vitals raporlarını izle.
5. Sorguları marka, ürün, planlama ve takip kümeleriyle değerlendir; birkaç günlük veriden sıralama sonucu çıkarma.

Bing Webmaster Tools:

1. Siteyi doğrula ve canonical sitemap'i gönder.
2. URL Inspection, Search Performance ve crawl sorunlarını incele.
3. İçerik yayın sıklığı arttığında IndexNow anahtarıyla resmî entegrasyonu ayrıca değerlendir.

Yapısal veri Google Rich Results Test ve Schema.org Validator ile kontrol edilebilir; geçerli schema rich result veya sıralama garantisi vermez.

## Ölçüm ve gizlilik

Analytics yalnızca mevcut izin mimarisi içinde çalışır. ChatGPT yönlendirmeleri analytics aracında `utm_source=chatgpt.com` kaynağıyla incelenebilir. Bunun için ayrı fingerprinting veya izinsiz takip eklenmez.

## Kaynaklar

- Google Search Central: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- Google sitemap kılavuzu: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Google structured data politikaları: https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- OpenAI yayıncı ve geliştirici SSS: https://help.openai.com/en/articles/12627856-publishers-and-developers-faq
- Bing Webmaster Guidelines: https://www.bing.com/webmasters/help/bing-webmaster-guidelines-30fba23a
- ÖSYM Sınav Takvimi: https://www.osym.gov.tr/Sayfa/SinavTakvimi/tr-TR
