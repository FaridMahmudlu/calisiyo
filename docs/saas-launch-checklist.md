# calisiyo SaaS yayına alma kontrol listesi

Bu belge, ücretli paketlerin eksik veya güvensiz yapılandırmayla yanlışlıkla açılmasını önlemek için hazırlanmış operasyonel kontrol listesidir. Uygulama, bütün zorunlu değerler sağlanana kadar ücretli ödeme akışını kapalı tutar.

## 1. İyzico hesabı ve hukuki kimlik

İyzico Link bireysel veya kurumsal satıcılar tarafından kullanılabilir; ancak calisiyo düzenli dijital hizmet satacağı için ticari ve vergisel statü bir mali müşavir/hukukçu ile doğrulanmalıdır. Uygulamadaki satıcı bilgileri İyzico sözleşmesi ve başvuru bilgileriyle birebir aynı olmalıdır.

Hazırlanacak bilgiler:

- Resmi ad-soyad veya ticari unvan
- Vergi kimlik veya MERSİS numarası (uygulanan hukuki statüye göre)
- İyzico hesabında doğrulanan IBAN ve kimlik/işletme belgeleri
- Resmi destek e-postası
- Telefon: `+90 555 049 73 60`
- Adres: `ATATÜRK MAH. 01117 NOLU SK. ZİRVE SİTESİ A BLOK NO:2 İÇ KAPI NO:11 ŞEHİTKAMİL / GAZİANTEP`

İyzico panelinde Link/API ürününün hesap için etkin olduğu doğrulanmalıdır. Production anahtarları yalnız İyzico onayından sonra kullanılmalıdır.

## 2. Vercel production değişkenleri

Aşağıdaki server-only değişkenler Vercel Project Settings → Environment Variables bölümüne eklenmelidir. Anahtarları mesaja, GitHub'a, ekran görüntüsüne veya `NEXT_PUBLIC_` önekli bir değişkene yazmayın.

```text
CALISIYO_LEGAL_NAME=<İyzico hesabındaki resmi ad/unvan>
CALISIYO_TAX_OR_MERSIS_NUMBER=<resmi vergi veya MERSİS numarası>
CALISIYO_SUPPORT_EMAIL=<gerçek destek e-postası>
IYZICO_ENVIRONMENT=production
IYZICO_API_URL=https://api.iyzipay.com
IYZICO_API_KEY=<production API key>
IYZICO_SECRET_KEY=<production secret key>
```

`SUPABASE_SERVICE_ROLE_KEY` zaten server-only production değişkeni olmalıdır. Değerler eklendikten sonra yeni bir production deployment gerekir.

## 3. İyzico ve site uyumu

Production öncesinde aşağıdakiler doğrulanmalıdır:

- Ürün ve fiyatlar `/paketler` sayfasında görünür.
- Gizlilik, KVKK, ön bilgilendirme, mesafeli satış, iptal/iade ve iletişim sayfaları açılır.
- İletişim ve sözleşmelerde resmi ad, vergi/MERSİS, e-posta, telefon ve adres hatasız görünür.
- Resmi “iyzico ile Öde”, Visa ve Mastercard logoları footer ve checkout'ta görünür.
- Site HTTPS kullanır.
- Aylık ve yıllık fiyat İyzico sayfasına değiştirilmeden aktarılır.

## 4. Sandbox ve production testi

Önce sandbox anahtarlarıyla başarılı, başarısız ve tekrarlanan doğrulama akışları test edilmelidir. Production'a geçerken `IYZICO_ENVIRONMENT`, API URL ve iki anahtar birlikte değiştirilmelidir.

Doğrulama senaryoları:

1. Ödeme yapılmadan “Ödemeyi doğrula” planı etkinleştirmemelidir.
2. Ödenen linkin token, conversation id, tutar, para birimi ve satılan adet bilgileri siparişle eşleşmelidir.
3. Aynı link ikinci kez plan süresi eklememelidir.
4. Aylık paket 30, yıllık paket 365 gün eklemelidir.
5. Paralel iki ilk ödeme iki ayrı süre olarak hesaplanmalıdır.
6. İptal/iade işlemleri sipariş, abonelik ve audit kayıtlarında uzlaştırılmalıdır.

## 5. Açılış kararı

Checkout yalnız aşağıdakiler tamamlandığında açılmalıdır:

- İyzico merchant/Link/API onayı
- Resmi hukuki ve vergi bilgilerinin doğrulanması
- Production anahtarları ve destek e-postası
- Güvenlik concurrency düzeltmeleri ve testleri
- Bir gerçek düşük tutarlı uçtan uca ödeme ve iade testi
- Sorumlu kişi tarafından hukuki metinlerin son kontrolü

Resmi kaynaklar:

- https://docs.iyzico.com/urunler/iyzico-link/iyzico-link-api/
- https://docs.iyzico.com/en/getting-started/preliminaries/authentication/hmacsha256-auth
- https://docs.iyzico.com/ek-bilgiler/iyzico-logo-paketi
- https://www.iyzico.com/destek/yardim-merkezi
