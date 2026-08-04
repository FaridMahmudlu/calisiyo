# YKS Çalışma Koçu — Teknik Uygulama Özeti

## Düzeltilenler

- Tekrarlanan Supabase browser client üretimi tekil istemciye dönüştürüldü.
- Dashboard altındaki kullanıcı verisi ekranlarına filtreli Supabase Realtime yenilemesi eklendi.
- Tüm ESLint hataları giderildi; React 19 hook ve statik bileşen kurallarıyla uyum sağlandı.
- UTC tabanlı gün anahtarları yerel tarih anahtarlarıyla değiştirildi.
- Sabit ve yanlış YKS tarihi kaldırıldı; tarih yalnızca `NEXT_PUBLIC_YKS_DATE` tanımlandığında gösteriliyor.
- Next.js 16 `middleware.js` dosyası `proxy.js` kuralına taşındı.
- Turbopack kök dizini yapılandırıldı ve çoklu lockfile uyarısı giderildi.
- Kayıt akışında e-posta doğrulaması açıkken oturum yoksa yanlış dashboard yönlendirmesi kaldırıldı.
- Giriş ve kayıt ekranlarına Google/Apple OAuth düğmeleri, güvenli PKCE callback route'u, sosyal kayıt sonrası profil tamamlama, şifre unutma ve şifre yenileme akışları eklendi.
- E-posta kaydına şifre doğrulama, daha anlaşılır Supabase hata mesajları ve doğrulama e-postası callback'i eklendi.
- Günlük programda TYT/AYT/YDT filtresi, gerçek hafta şeridi, özet metrikleri, hata geri alma ve onaylı silme eklendi.
- Haftalık programa alan tabanlı sınav filtresi eklendi.
- Pomodoro tamamlanan odak oturumlarını `calisma_suresi` tablosuna kaydediyor; ders/kaynak bağlamı ve günlük oturum özeti eklendi.
- Hedefler ekranındaki sabit sahte değerler kaldırıldı. Hedefler kullanıcı metadata'sında saklanıyor; güncel değerler deneme, görev, çalışma ve konu kayıtlarından hesaplanıyor.
- Ayarlara alan, tema, bildirim tercihleri, şifre güncelleme ve JSON/CSV dışa aktarma eklendi.
- Kaynaklara sınav/kitap türü filtresi ve özel kapak görseli; yapamadığım sorulara görsel ve kaynak alanı eklendi.
- Konu tamamlandığında 1, 7 ve 30 gün sonrasına otomatik tekrar oluşturacak güvenli veritabanı migration'ı hazırlandı.
- Landing, giriş, kayıt ve dashboard dışı tüm çalışma ekranları seçilen beyaz/emerald/slate tasarım sistemine geçirildi.
- Next.js 16.3.0'a yükseltildi; npm production audit sonucu 0 güvenlik açığıdır.
- Profil Realtime kanalında yanlış `user_id` filtresi `profiles.id` filtresiyle düzeltildi.

## Veritabanı migration'ı

`supabase/migrations/20260804114721_enrich_study_data.sql` şunları içerir:

- özel kaynak kapakları ve soru görselleri için alanlar;
- Pomodoro-kaynak ilişkisi;
- otomatik tekrar alanları, benzersiz indeks ve trigger;
- kullanıcıya özel, 6 MB ve yalnızca JPG/PNG/WebP kabul eden private Storage bucket/policy seti;
- kullanıcı tablolarının `supabase_realtime` publication kapsamına güvenli biçimde eklenmesi.

Migration `gplzgilcnbagglzqdrnv` referanslı uzak `calisiyo` projesine uygulandı. Yedi migration sürümünün yerel ve uzak geçmişi eşleşiyor.

## OAuth provider durumu

- Uygulama tarafındaki Google ve Apple OAuth akışları tamamlandı.
- Supabase `/auth/v1/settings` kontrolünde Google ve Apple provider'ları hâlâ kapalı dönüyor.
- Tam aktivasyon için Google Cloud OAuth Client ID/Secret ve Apple Developer Services ID/Secret değerleri Supabase Auth Providers ekranına eklenmelidir. Bu üçüncü taraf kimlik bilgileri proje veya ortamda mevcut değildir ve güvenli biçimde tahmin edilemez.
- Supabase Site URL üretim adresine, redirect allow-list ise yerel ve Vercel callback adreslerine güncellendi.
- Projede custom SMTP bulunmadığı ve Supabase'in built-in göndericisi production kullanıcılarına uygun olmadığı için e-posta kaydı geçici olarak otomatik onaylıdır; kullanıcılar e-posta beklemeden hesap açıp giriş yapabilir. Güvenli e-posta doğrulaması ve şifre sıfırlama teslimatı için custom SMTP eklenmelidir.

## Doğrulama

- ESLint: geçti.
- Next.js 16.3 production build: geçti; 24 route üretildi.
- npm production audit: 0 güvenlik açığı.
- Genel sayfalar: HTTP 200.
- Yetkisiz dashboard erişimi: `/giris` sayfasına HTTP 307.
- Playwright: 1440 × 1024 ve 390 × 844 görsel/etkileşim QA koşusu geçti.
- Giriş, kayıt, tüm dashboard route'ları, günlük görev CRUD, Pomodoro ve mobil menü test edildi; son koşuda konsol/page hatası ve HTTP 4xx/5xx olmadı.
- Kaynak ile uygulama aynı karşılaştırma görselinde incelendi; `design-qa.md` sonucu `passed`.
