# İçerik üretici kodu: kayıt ve otomatik indirim işletim rehberi

Bu akış yönlendirme bağlantısı, UTM, QR kodu veya kampanya çerezi kullanmaz. Yeni kullanıcı, içerik üretici kodunu yalnızca kayıt ekranındaki isteğe bağlı alana kendisi yazar.

## Güvenlik ve veri akışı

1. Alandan çıkarken yapılan hafif kod kontrolü yalnızca mevcut durumu okur; kalıcı talep satırı oluşturmaz.
2. Kullanıcı e-posta akışında son “Hesabı Oluştur” adımıyla gerçek kayıt isteğini gönderdiğinde veya Google kaydını başlattığında sunucu kriptografik olarak rastgele, 256 bitlik tek kullanımlık bir talep anahtarı üretir.
3. Veritabanında anahtarın kendisi değil yalnızca SHA-256 özeti ve 7 günlük son kullanma zamanı tutulur.
4. E-posta ile anında oturum, e-posta onayı ve Google OAuth dönüşü aynı sunucu RPC'si ile ilişkilendirilir.
5. RPC hesabın talep zamanına göre gerçekten yeni olduğunu (yalnızca 5 saniyelik saat sapması payıyla), kullanıcının içerik üreticisi olmadığını, kodun hâlâ geçerli olduğunu ve hesabın daha önce ilişkilendirilmediğini doğrular.
6. İlişki kullanıcı başına tektir ve değiştirilemez. Aynı talebin ağ tekrarı idempotenttir; farklı bir kodla ikinci ilişkilendirme reddedilir.

İçerik üreticisi yalnızca 7 gün, 30 gün veya tüm zamanlar için toplu kayıt, aktivasyon, deneme, ücretli dönüşüm ve doğrulanmış satış sayılarını görür. Öğrenci adı, e-posta adresi, çalışma verileri veya tekil hesap listesi gösterilmez.

Aktivasyon, ilişkilendirmeyi izleyen ilk 7 gün içinde en az bir gerçek `daily_focus` olayı veya en az iki gerçek XP olayıdır. Deneme başlangıcı yalnızca `billing_events.event_type = 'trial_started'`, ücretli dönüşüm doğrulanmış ve iade edilmemiş siparişler, satış ise ödül ledger'ı üzerinden hesaplanır.

## Shopier ürünleri

İndirim URL parametresiyle veya belgelenmemiş bir ödeme hilesiyle uygulanmaz. İki ayrı, sabit fiyatlı içerik üretici ürünü gerekir:

- YKS 2027: liste 2.500 TL, ödenecek 2.000 TL
- YKS 2028: liste 4.500 TL, ödenecek 3.600 TL

Bu ürünlere Shopier kuponu veya otomatik indirim eklenmemelidir. Kayıt koduyla ilişkilendirilmiş kullanıcıda ürün hazır değilse ödeme kapalı kalır; kullanıcı tam fiyatlı ürüne sessizce yönlendirilmez. İlişkilendirilmemiş kullanıcıların standart ödeme akışı değişmez.

İlişkilendirme oluşturulduktan sonra içerik üreticisinin askıya alınması öğrencinin kazanılmış %20 fiyatını kaldırmaz. Bununla birlikte askıya alma anından sonraki doğrulanmış satışlar içerik üreticisine yeni kazanç üretmez; ledger üzerinde gerekçeli ve sıfır tutarlı olarak tutulur. Kod değişikliği de geçmiş ilişkilendirmedeki kod görüntüsünü veya öğrenci fiyatını değiştirmez.

Gerekli sunucu değişkenleri `.env.example` dosyasında tanımlıdır. `SHOPIER_CREATOR_PRODUCTS_VALIDATED=true` yalnızca canlı ürün kimlikleri, fiyatlar ve ek indirim bulunmadığı doğrulandıktan sonra ayarlanmalıdır.

## Yayına alma sırası

1. Veritabanı migration'ını staging ortamında uygulayın ve SQL regresyon testlerini çalıştırın.
2. Shopier'de 2.000 TL ve 3.600 TL fiyatlı iki ayrı ürün oluşturun. Ürünlere kupon veya otomatik indirim kapsamı vermeyin.
3. Dört `SHOPIER_CREATOR_PRODUCT_*` değişkenini yalnızca sunucu ortamına girin.
4. `SHOPIER_CREATOR_PRODUCTS_VALIDATED=false` iken `npm run shopier:verify` çalıştırın; rapor temizse değeri `true` yapıp yeniden çalıştırın.
5. Önce staging'de yeni e-posta hesabı, e-posta onaylı hesap ve yeni Google hesabıyla kayıt kodunu deneyin. Eski Google hesabına kod eklenemediğini doğrulayın.
6. 2027 ve 2028 test siparişlerinde Shopier tutarının sırasıyla 2.000 TL ve 3.600 TL olduğunu, ek indirimin reddedildiğini, webhook tekrarının ikinci ödül oluşturmadığını doğrulayın.
7. Üretici ve yönetici panellerinde toplu metrikleri, askıya alma ve iade durumlarını kontrol edin.
8. Gizlilik, KVKK, çerez ve kullanım şartlarındaki yeni açıklamaları hukuk danışmanına inceletin.

## Operasyonel izleme

- Talep üretimi veritabanında işlem kilidiyle serileştirilir. Son savunma olarak sistem genelinde dakikada 600 ve 50.000 aktif, kullanılmamış talep sınırı vardır; küçük bir kod başına kota kullanılmadığı için tek bir üreticinin kodu kolayca hizmet dışı bırakılamaz. Sınır aşımında API `429` ve `Retry-After: 60` döndürür; IP veya cihaz kimliği saklanmaz.
- Kod doğrulama ve talep hatalarını oran bazında izleyin; loglarda ham talep anahtarı veya kullanıcı PII'si tutmayın.
- Hem salt-okuma doğrulama hem de talep üretme endpoint'i için dağıtım katmanında hız sınırı uygulayın; veritabanı sınırı bunun yerine geçmez.
- Bakım RPC'si en fazla 500 satırı, kayıt sırasında fırsatçı temizlik ise en fazla 100 satırı siler. Yalnızca tüketildikten veya süresi dolduktan sonra en az 14 gün geçmiş geçici talepler temizlenir; ilişkilendirme ve finansal ledger kayıtları hiçbir zaman silinmez. Trafik azsa bakım RPC'sini günlük zamanlayın.
- Shopier ürün fiyatı değiştiğinde önce doğrulama komutunu çalıştırın. Doğrulama bayrağını fiyat değişikliği sırasında kapatın.
- İadeler mevcut uzlaştırma işleviyle ödülü tersine çevirir; manuel veritabanı güncellemesi yapmayın.

## Geri alma

Yeni kayıtları geçici olarak durdurmak için `SHOPIER_CREATOR_PRODUCTS_VALIDATED=false` yapın. Bu, ilişkilendirilmiş kullanıcıların ödemesini güvenli biçimde kapatır; mevcut atıfları, siparişleri, ödülleri veya kullanıcı verilerini silmez. Migration ileri yönlüdür; üretim verisini geri yazan veya geçmiş kayıtları yeniden sınıflandıran bir geri alma işlemi uygulanmamalıdır.
