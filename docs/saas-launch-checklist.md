# calisiyo Shopier yayına alma kontrol listesi

Ücretli satış, aşağıdaki koşulların tamamı doğrulanana kadar uygulamadaki readiness kapısı tarafından kapalı tutulur. Shopier Personal Access Token ve webhook tokenları hiçbir zaman GitHub'a, tarayıcıya veya `NEXT_PUBLIC_` değişkenine yazılmamalıdır.

## 1. Hukuki ve mağaza bilgileri

- Resmi ad-soyad veya ticari unvan
- Vergi kimlik veya MERSİS numarası (uygulanan statüye göre)
- Shopier hesabında doğrulanmış mağaza/ödeme bilgileri
- `calisiyo.destek@gmail.com`, telefon ve açık adres
- Shopier ürün fiyatlarının sırasıyla 2.500 TRY ve 1.500 TRY olması

## 2. Server-only production değişkenleri

```text
CALISIYO_LEGAL_NAME=<resmi ad/unvan>
CALISIYO_TAX_OR_MERSIS_NUMBER=<resmi vergi veya MERSİS numarası>
CALISIYO_SUPPORT_EMAIL=calisiyo.destek@gmail.com
SHOPIER_ACCESS_TOKEN=<Personal Access Token>
SHOPIER_PRODUCT_ID_2027=<API ürün kimliği>
SHOPIER_PRODUCT_ID_2028=<API ürün kimliği>
SHOPIER_PRODUCT_URL_2027=https://www.shopier.com/50041880
SHOPIER_PRODUCT_URL_2028=https://www.shopier.com/50041981
SHOPIER_WEBHOOK_SECRETS=<order.created ve refund.updated tokenları, virgülle ayrılmış>
SHOPIER_PRODUCTS_VALIDATED=true
SHOPIER_PROMO_SCOPE_VERIFIED=true
SUPABASE_SERVICE_ROLE_KEY=<server-only service role key>
```

Public ürün URL'sindeki sayı API ürün kimliği kabul edilmez. PAT'i yerel `.env.local` içine koyduktan sonra önce:

```bash
npm run shopier:verify
```

komutu çalıştırılmalı; yalnız başarılı sonuçtan sonra `SHOPIER_PRODUCTS_VALIDATED=true` yapılmalıdır.

## 3. Webhooklar

Production endpoint:

```text
POST https://calisiyo-theta.vercel.app/api/billing/shopier/webhook
```

Gerekli olaylar `order.created` ve `refund.updated` olaylarıdır. Önce mevcut kayıtları güvenli biçimde denetle:

```bash
npm run shopier:webhooks
```

Eksikler varsa tokenları konsola yazmadan yerel, git-ignore edilmiş dosyaya kaydet:

```bash
npm run shopier:webhooks -- --create --secret-output .shopier-webhook-tokens.json
```

Dosyadaki iki token Vercel'de `SHOPIER_WEBHOOK_SECRETS` içine virgülle ayrılarak eklenir; ardından yerel dosya güvenle silinir. Kayıt scripti aynı callback/olay çiftini tekrar oluşturmaz.

## 4. Production kabul testi

1. Ödeme yapılmadan doğrulama Plus erişimi vermemeli.
2. Webhook imzası bozuk veya eksikse 401 dönmeli ve olay kaydedilmemeli.
3. Ödenmiş order; ürün, tutar, TRY, adet 1 ve tam normalize e-posta eşleşmesi olmadan etkinleşmemeli.
4. Aynı Shopier order/webhook ikinci kez süre eklememeli.
5. `plus_2027` 19 Ağustos 2027, `plus_2028` 25 Haziran 2028 sabit bitiş politikasını kullanmalı.
6. E-posta/ürün/tutar uyuşmazlığı otomatik onay yerine inceleme kuyruğuna düşmeli.
7. Başarılı tam iade kaydedilmeli; erişim, açık işletme politikası olmadığı için insan incelemesi olmadan azaltılmamalı.
8. Shopier checkout sayfasına bir gerçek düşük tutarlı uçtan uca ödeme/iade testi yapılmalı.

`plus_2027` için 19 Ağustos 2027 tarihi ürün politikasıdır. Resmi YKS tarihi değişirse backend bitiş tarihi ile müşteri sözleşmeleri aynı yayın değişikliğinde birlikte güncellenmelidir.

Resmi kaynaklar:

- https://developer.shopier.com/docs/creating-and-using-pats
- https://developer.shopier.com/reference/get-products
- https://developer.shopier.com/reference/get-orders
- https://developer.shopier.com/reference/webhook-configuration
- https://developer.shopier.com/reference/events-headers-payloads
- https://developer.shopier.com/reference/the-refund-model
