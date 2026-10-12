# Planliyo · Google Play yayın paketi

Paket adı: `tr.com.planliyo.app` · targetSdk 36 · minSdk 24 · Expo SDK 57 · EAS `production` profili AAB üretir ve `versionCode`'u otomatik artırır.

## 1. Mağaza girişi (Store listing · Türkçe)

**Uygulama adı (30):** `Planliyo: YKS Çalışma Koçu`

**Kısa açıklama (80):** `YKS programı, kronometre, deneme analizi ve çalışma sınıfları tek uygulamada.`

**Tam açıklama:**

```
Planliyo, YKS’ye hazırlanan öğrenciler için planlama, odak ve gelişim uygulamasıdır. Ne çalışacağını planla, kronometreyle gerçek çalışma süreni kaydet ve denemelerinle ilerlemeni gör.

PLANLA
• Alanına (Sayısal, Eşit Ağırlık, Sözel, Dil) ve YKS yılına göre TYT, AYT ve YDT dersleri
• Günlük ve haftalık çalışma programı, tek dokunuşla görev tamamlama
• Konu takibi, tekrar planı ve hatırlatmalar
• YouTube oynatma listelerini çalışma planına dönüştürme

ODAKLAN
• 25/5, 50/10, 90/20 veya özel sürelerle kronometre
• Kilit ekranında ve durum çubuğunda canlı geri sayım; bildirimden duraklat, devam et
• Süre bittiğinde bildirim, oturumlar ders ve kaynak bazında istatistiklere eklenir
• Ana ekran widget’ları ve uygulama kısayollarıyla tek dokunuşla odak başlat

GELİŞİMİNİ GÖR
• Deneme analizi: net hesabı, ders bazlı sonuçlar ve gelişim grafikleri
• Yapamadığım sorular defteri, not defteri ve kaynak takibi
• Günlük seri, XP ve seviyeler; tüm veriler gerçek çalışma kayıtlarından

BİRLİKTE ÇALIŞ
• Arkadaşlarınla çalışma sınıfları: canlı odak, mesaj, sesli mesaj ve ortak tahta
• Şikâyet ve engelleme araçlarıyla güvenli topluluk

GÜVENLİ VE ŞEFFAF
• Hesabını ve verilerini uygulama içinden veya planliyo.com.tr/hesap-silme adresinden silebilirsin
• Biyometrik kilit desteği
• Uygulama içinde reklam yoktur

Planliyo ücretsiz kullanılabilir. Gelişmiş özellikler için planliyo plus paketleri planliyo.com.tr üzerinden sunulur.

Destek: destek@planliyo.com.tr
```

**Kategori:** Eğitim · **Etiketler:** Eğitim, Verimlilik, Sınav hazırlığı
**İletişim:** destek@planliyo.com.tr · https://planliyo.com.tr
**Gizlilik politikası:** https://planliyo.com.tr/gizlilik

**Grafikler** (`mobile/store-assets/`, `npm run assets:brand` ile üretilir):
- Uygulama simgesi 512×512: `play-icon-512.png`
- Öne çıkan grafik 1024×500: `play-feature-graphic.png`
- Telefon ekran görüntüleri (en az 2, önerilen 6; 1080×1920 veya 1080×2340, kişisel veri içermeyen demo hesapla): Bugün, Program, Kronometre (kilit ekranı canlı geri sayım), Deneme Analizi, Çalışma Sınıfı, Widget’lar.

## 2. Uygulama içeriği (App content)

| Bölüm | Cevap |
|---|---|
| Gizlilik politikası | https://planliyo.com.tr/gizlilik |
| Uygulama erişimi | Tüm özellikler giriş gerektirir → “Tüm işlevler özel erişim gerektiriyor”. İnceleme için bir demo hesabı (e-posta + şifre) gir; profil tamamlanmış ve örnek veriler yüklenmiş olsun. |
| Reklamlar | Hayır, reklam içermez. |
| İçerik derecelendirmesi | Kategori: Eğitim/Referans. Şiddet, cinsellik, kumar, uyuşturucu: Hayır. **Kullanıcılar etkileşime girebilir: Evet** (sınıf sohbeti, sesli mesaj, dosya). İçerik moderasyonu: şikâyet + engelleme + yönetici inceleme. Konum paylaşımı: Hayır. Dijital satın alma (uygulama içi): Hayır. |
| Hedef kitle | 16–17 ve 18+ (13 yaş altı hedeflenmez). Çocuklara yönelik değil. |
| Haber uygulaması | Hayır |
| Sağlık / Finans / Devlet | Hayır |
| Hesap silme | Uygulama içi: Ayarlar → Hesabı sil. Web: https://planliyo.com.tr/hesap-silme |

### Veri güvenliği (Data safety)

Tüm veriler aktarım sırasında şifrelenir (HTTPS). Kullanıcı hesabını ve verilerini silebilir. Veriler üçüncü taraflarla **paylaşılmaz** (Supabase, Expo, Sentry, PostHog yalnızca hizmet sağlayıcıdır).

| Veri türü | Toplanıyor | Amaç | İsteğe bağlı |
|---|---|---|---|
| Ad | Evet | Hesap yönetimi, uygulama işlevi | Hayır |
| E-posta adresi | Evet | Hesap yönetimi, iletişim | Hayır |
| Kullanıcı kimlikleri | Evet | Hesap yönetimi | Hayır |
| Satın alma geçmişi | Evet | Paket durumunu göstermek | Hayır |
| Mesajlar (uygulama içi) | Evet | Uygulama işlevi (çalışma sınıfı) | Evet |
| Fotoğraflar | Evet | Uygulama işlevi (soru/not görselleri) | Evet |
| Ses kayıtları | Evet | Uygulama işlevi (sesli mesaj) | Evet |
| Dosyalar ve belgeler | Evet | Uygulama işlevi (sınıf dosyaları) | Evet |
| Uygulama etkileşimleri / diğer kullanıcı içeriği | Evet | Uygulama işlevi, analiz | Analiz isteğe bağlı (izinle) |
| Kilitlenme günlükleri, tanılama | Evet | Uygulama performansı | Hayır |
| Cihaz veya diğer kimlikler | Evet (bildirim jetonu) | Bildirim gönderme | Evet |

Konum, kişiler, takvim, sağlık, finans bilgisi, web geçmişi: **toplanmaz**.

### İzin gerekçeleri

- `POST_NOTIFICATIONS`: plan/tekrar hatırlatmaları ve kronometre bitişi.
- `SCHEDULE_EXACT_ALARM`: kronometre bitiş bildiriminin tam zamanında gelmesi (kullanıcı onaylı, temel işlev: zamanlayıcı).
- `POST_PROMOTED_NOTIFICATIONS`: çalışan kronometrenin canlı güncelleme (Live Update) olarak gösterilmesi.
- `RECORD_AUDIO`: sınıf sohbetinde sesli mesaj (yalnızca kullanıcı kayda bastığında).
- `CAMERA`: soru fotoğrafı çekme (yalnızca kullanıcı seçtiğinde). Galeri için sistem fotoğraf seçicisi kullanılır, medya izni istenmez.
- `USE_BIOMETRIC`: isteğe bağlı uygulama kilidi.

## 3. Yayın adımları

1. **AAB üret:** `cd mobile` → `npx eas-cli@latest build -p android --profile production`. İlk seferde “Generate a new Android Keystore?” sorusuna **Yes** de (anahtar EAS’ta güvenle saklanır).
2. **Play Console’da uygulama oluştur:** Ad “Planliyo”, varsayılan dil Türkçe, Uygulama, Ücretsiz.
3. **İlk yükleme:** Test → Dahili test → Yeni sürüm → AAB’yi yükle (ilk yükleme elle yapılmalı). Play App Signing’i kabul et.
4. **Google ile giriş için SHA-1:** Play Console → Test ve sürüm → Uygulama bütünlüğü → *Uygulama imzalama anahtarı sertifikası* SHA-1’ini kopyala → Google Cloud → Kimlik bilgileri → Android OAuth istemcisi (`tr.com.planliyo.app`) → SHA-1 ekle. (EAS yükleme anahtarının SHA-1’i: `npx eas-cli credentials -p android`.)
5. **Kapalı test (kişisel geliştirici hesapları için zorunlu):** En az **12 test kullanıcısı**, **14 gün boyunca** kesintisiz katılmış olmalı; sonra üretim erişimi başvurusu yapılır.
6. **Üretim:** Mağaza girişi + Uygulama içeriği tamamlanınca Üretim → Yeni sürüm → aşamalı yayın (%20 → %100).
7. **Sonraki sürümler:** `npx eas-cli build -p android --profile production` ve `npx eas-cli submit -p android --profile production` (servis hesabı JSON’u `mobile/google-play-service-account.json`, git’e eklenmez).
