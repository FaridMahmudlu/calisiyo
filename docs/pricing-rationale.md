# calisiyo fiyatlandırma gerekçesi

Son pazar kontrolü: **13 Ağustos 2026**

Bu belge, calisiyo paketlerinin neden bu fiyat ve limitlerle konumlandırıldığını kaydeder. Rakipler birebir aynı ürün değildir; fiyatlar yalnızca pazar aralığını anlamak için kullanılmıştır.

## Pazar sinyalleri

| Ürün | Gözlenen teklif | Ürün farkı | Kaynak |
| --- | ---: | --- | --- |
| Öğrenci Takip: YKS AI Koç | Aylık Premium ₺99,99; Premium+ Aylık ₺179,99; Premium+ Yıllık ₺1.299,99 | Mobil takip ve AI özellikleri sunan en yakın self-servis karşılaştırmalardan biri | [Apple App Store](https://apps.apple.com/tr/app/%C3%B6%C4%9Frenci-takip-yks-ai-ko%C3%A7/id6458837034) |
| Kunduz YKS 2027 Full | ₺5.454,99/ay; 11 ay toplam ₺59.999,99 | Birebir insan koçluğu, canlı ders, soru çözümü ve fiziksel/dijital eğitim içeriği içerir; calisiyo ile doğrudan eşdeğer değildir | [Kunduz resmi paket sayfası](https://prod.kunduz.com/tr/paketler/yks-2027-full-paket/) |
| Kunduz YKS 2027 Soru Çözüm | ₺927,99/ay, 11 ay | Eğitmen destekli soru çözümü ve içerik ağırlıklıdır; self-servis planlama aracından farklı maliyet yapısına sahiptir | [Kunduz YKS 2027 paketleri](https://prod.kunduz.com/tr/paketler/yks-2027/) |

## calisiyo konumlandırması

calisiyo canlı öğretmen veya birebir insan koçu satmaz. Temel değer; planlama, çalışma süresi, Pomodoro, konu ve tekrar takibi, deneme analizi, gerçek zamanlı çalışma sınıfları ve kullanıcının kendi verilerinden üretilen ilerleme görünümüdür. Bu nedenle fiyatlar insan destekli koçluk paketlerinden belirgin şekilde düşük, benzer self-servis uygulama aralığıyla uyumlu tutulmuştur.

| Plan | 30 gün | 365 gün | Yıllık avantaj | Rol |
| --- | ---: | ---: | ---: | --- |
| Başlangıç | Ücretsiz | Ücretsiz | — | Ürünü risksiz deneme ve temel çalışma düzenini kurma |
| Odak | ₺89,90 | ₺899,00 | Yaklaşık %16,7 | Düzenli kullanıcı için geniş limitler ve sınıf özellikleri |
| Zirve | ₺149,90 | ₺1.499,00 | Yaklaşık %16,7 | Yoğun kullanıcı için en yüksek limitler ve rapor dışa aktarma |

Yıllık paketler otomatik yenilenmez; 365 günlük ön ödemeli erişimdir. İndirim, aylık fiyatın 12 katına göre hesaplanmıştır.

## Karar ilkeleri

- Başlangıç planı kalıcı olarak kullanılabilir olmalı; ücretli plana zorlayan yapay veri kilitleri yaratılmamalıdır.
- Limitler yalnız arayüzde değil, Supabase RLS/RPC katmanında da uygulanmalıdır.
- Ücretli planlar gerçek kullanım yoğunluğu ve altyapı maliyeti artışını karşılamalıdır.
- İnsan koçluğu veya garanti edilen sınav sonucu izlenimi verilmemelidir.
- Fiyatlar en az üç ayda bir; enflasyon, ödeme komisyonu, altyapı maliyeti, dönüşüm ve iptal oranıyla yeniden değerlendirilmelidir.
- Fiyat değişikliği mevcut ön ödemeli erişim süresini geriye dönük etkilememelidir.

## İzlenecek metrikler

- Ücretsizden ücretliye dönüşüm oranı
- 30 günlük aktif kullanıcı başına altyapı maliyeti
- Plan başına limit kullanım yüzdeleri
- Ödeme başarı, iade ve mükerrer işlem oranı
- Odak ve Zirve planlarında 30/90 günlük aktif kullanım
- Destek talebi ve iptal gerekçeleri

Bu belge hukuki veya mali danışmanlık değildir. Vergi, tüketici hukuku ve fiyat gösterimi son açılış öncesinde yetkin bir mali müşavir/hukukçu tarafından doğrulanmalıdır.
