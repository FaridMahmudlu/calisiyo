export const CONTENT_UPDATED_AT = '2026-08-27';

export const GUIDES = Object.freeze([
  {
    slug: 'yks-calisma-programi',
    kicker: 'Planlama rehberi',
    title: 'YKS çalışma programı nasıl hazırlanır?',
    description: 'Günlük ve haftalık YKS çalışma programını gerçek kapasiteye göre kurmak, uygulamak ve verilerle güncellemek için pratik rehber.',
    summary: 'Ders listesinden değil, kullanılabilir zamandan başlayan; günlük görevlerle haftalık hedefleri aynı düzende buluşturan uygulanabilir bir program kur.',
    answer: 'İyi bir YKS çalışma programı; haftalık kullanılabilir süreyi belirler, ders ve konu önceliklerini bu süreye dağıtır, her göreve ölçülebilir bir süre veya soru hedefi verir ve hafta sonunda gerçekleşen kayıtlara göre güncellenir. Programın amacı her saati doldurmak değil, uygulanabilir bir çalışma ritmi kurmaktır.',
    publishedAt: '2026-08-27',
    updatedAt: '2026-08-27',
    sections: [
      {
        title: 'Önce gerçek haftalık kapasiteni bul',
        paragraphs: [
          'Okul, kurs, ulaşım, uyku ve dinlenme için ayrılan zamanı hesaba katmadan hazırlanan program ilk yoğun günde bozulur. Önce haftanın sabit saatlerini işaretle; sonra gerçekten çalışmaya ayırabileceğin blokları çıkar.',
          'Yeni başlayan biri için her boşluğu dersle doldurmak yerine birkaç sürdürülebilir çalışma bloğu seçmek daha ölçülebilirdir. Bir haftalık uygulamadan sonra planlanan süre ile gerçekleşen süreyi karşılaştırıp kapasiteni düzelt.',
        ],
        checklist: ['Sabit okul ve kurs saatlerini yaz', 'Uyku ve temel dinlenme aralıklarını koru', 'Ulaşım ve hazırlık payını unutma', 'Beklenmeyen işler için boş bir telafi bloğu bırak'],
      },
      {
        title: 'Dersleri konu ve çıktı düzeyine indir',
        paragraphs: ['“Matematik çalış” gibi geniş bir görev bittiğinde ne üretildiğini göstermez. Görevi konu, süre ve mümkünse soru hedefiyle tanımla. Böylece tamamlanan çalışma ile sonraki adım arasında açık bir bağ kurarsın.'],
        table: {
          headers: ['Belirsiz görev', 'Ölçülebilir görev'],
          rows: [
            ['Matematik çalış', 'Fonksiyonlar · 50 dakika · 24 soru'],
            ['Türkçe tekrar et', 'Paragrafta ana düşünce · 35 dakika · 20 soru'],
            ['Fen bak', 'Hareket ve kuvvet yanlışlarını incele · 30 dakika'],
          ],
        },
      },
      {
        title: 'Günlük plan ile haftalık planı ayrı defterler gibi kullanma',
        paragraphs: ['Haftalık görünüm yönü, günlük görünüm ise bugünkü sırayı göstermelidir. Calisiyo’da aynı görev günlük ve haftalık programda birlikte görünür; bir kaydı iki kez yazmana gerek kalmaz. Haftalık önceliği günlük bir saate yerleştirirken görev süresini gerçek boşluğuna göre ayarla.'],
        steps: [
          ['1', 'Haftalık önceliği seç', 'Bu hafta ilerlemesi gereken 3–5 konu belirle.'],
          ['2', 'Güne yerleştir', 'Her konuya tarih, başlangıç saati ve gerçekçi süre ver.'],
          ['3', 'Gerçekleşeni kaydet', 'Kronometreyi veya manuel çalışma kaydını kullan.'],
          ['4', 'Hafta sonunda düzelt', 'Eksik kalanları körlemesine taşımak yerine neden tamamlanmadığını incele.'],
        ],
      },
      {
        title: 'Günde kaç saat çalışmalıyım?',
        paragraphs: ['Herkes için doğru tek bir saat sayısı yoktur. Okul düzeni, konu eksiği, sınava kalan dönem ve sürdürülebilirlik kişiden kişiye değişir. İlk hedefini geçmiş bir haftada gerçekten yapabildiğin ortalamaya yakın kur; düzen oturduğunda küçük artışlar dene.', 'Sadece masada geçirilen süreyi değil, tamamlanan konu, çözülen soru ve deneme geri bildirimini birlikte değerlendir. Süre artarken çıktı düşüyorsa planın yoğunluğu veya mola yapısı yeniden ele alınmalıdır.'],
      },
      {
        title: 'Programın çalışıp çalışmadığını nasıl anlarsın?',
        paragraphs: ['Hafta sonunda üç soruya bak: Planlanan görevlerin ne kadarı tamamlandı, doğrulanmış çalışma süresi günlere nasıl dağıldı ve deneme/konu kayıtları hangi eksiği gösterdi? Bu üç veri, gelecek haftanın planını tahminden çok gerçekleşen çalışmaya dayandırır.'],
        callout: 'Program uyumu düşükse önce görevin süresini, saatini veya kapsamını düzelt. Aynı yapılmayan görevi haftalarca taşımak ilerleme değildir.',
      },
    ],
    sources: [
      { label: 'ÖSYM Sınav Takvimi', href: 'https://www.osym.gov.tr/Sayfa/SinavTakvimi/tr-TR', note: 'Sınav tarihleri için yalnızca güncel resmî takvimi kontrol et.' },
    ],
    related: ['yks-calisma-suresi-takibi', 'yks-konu-takibi'],
    cta: { label: 'Programını calisiyo’da oluşturmaya başla', href: '/kayit' },
  },
  {
    slug: 'yks-deneme-analizi',
    kicker: 'Deneme rehberi',
    title: 'YKS deneme analizi nasıl yapılır?',
    description: 'TYT, AYT ve YDT denemelerinde neti doğru hesaplamak, ders kırılımını yorumlamak ve sonucu çalışma planına çevirmek için rehber.',
    summary: 'Deneme sonucunu tek bir toplam net yerine ders, yanlış türü, süre ve sonraki çalışma kararıyla birlikte değerlendir.',
    answer: 'YKS deneme analizi; doğru ve yanlış sayılarını kaydetmekle başlar, neti doğru − yanlış/4 formülüyle hesaplar ve sonucu ders bazında karşılaştırır. Asıl değer, her düşük veya değişen değeri bir sonraki çalışma kararına dönüştürmektir.',
    publishedAt: '2026-08-27',
    updatedAt: '2026-08-27',
    sections: [
      {
        title: 'Önce ham veriyi doğru kaydet',
        paragraphs: ['Her ders için doğru ve yanlış sayılarını ayrı gir. Bilinen soru sayısında boş, toplam soru sayısından doğru ve yanlış çıkarılarak bulunur; doğru ile yanlış toplamı dersin soru sayısını aşmamalıdır. Calisiyo neti doğru − yanlış/4 olarak saklar ve ders kırılımlarını aynı deneme altında tutar.'],
        table: { headers: ['Soru', 'Doğru', 'Yanlış', 'Otomatik boş', 'Net'], rows: [['40', '34', '3', '3', '33,25'], ['40', '40', '0', '0', '40,00']] },
      },
      {
        title: 'Toplam net tek başına yeterli değildir',
        paragraphs: ['Aynı toplam net iki farklı tabloyu gizleyebilir. Bir denemede Matematik yükselirken Türkçe düşmüş olabilir; başka bir denemede tüm dersler benzer kalmış olabilir. Bu yüzden toplam netin yanında ders bazındaki değişime ve sınav süresine bak.'],
        checklist: ['Ders bazında doğru, yanlış ve boş', 'Önceki benzer türdeki denemeye göre net değişimi', 'Süre yetişmeyen ders veya bölüm', 'Bilgi eksiği, işlem hatası ve dikkat hatası ayrımı'],
      },
      {
        title: 'Yanlışı çalışma kararına çevir',
        steps: [
          ['1', 'Yanlışın nedenini yaz', 'Konu bilinmiyor mu, yöntem mi karıştı, süre mi yetmedi?'],
          ['2', 'Konuyu doğrula', 'Konu takibindeki mevcut durumun gerçek sonucu yansıtıp yansıtmadığını kontrol et.'],
          ['3', 'Küçük bir görev oluştur', '“Matematik çalış” yerine ilgili konu ve soru tipini planla.'],
          ['4', 'Bir sonraki denemede karşılaştır', 'Aynı dersin neti ve süre davranışı değişti mi bak.'],
        ],
      },
      {
        title: '0, 1 ve çok sayıda denemeyi farklı yorumla',
        paragraphs: ['Henüz kayıt yoksa çıkarım yapmak mümkün değildir. Tek kayıt başlangıç noktasıdır, trend değildir. Birden fazla karşılaştırılabilir deneme olduğunda yön ve dalgalanma konuşulabilir; farklı sınav türlerini tek çizgide yorumlamak yanıltıcı olabilir.'],
        callout: 'Calisiyo başarı tahmini veya puan garantisi vermez. Grafikler yalnızca hesabına kaydettiğin deneme verilerini gösterir.',
      },
    ],
    sources: [],
    related: ['yks-calisma-programi', 'yks-konu-takibi'],
    cta: { label: 'Deneme kayıtlarını tek yerde takip et', href: '/kayit' },
  },
  {
    slug: 'yks-konu-takibi',
    kicker: 'Konu takibi rehberi',
    title: 'YKS konu takibi nasıl yapılır?',
    description: 'TYT, AYT ve YDT konularını durum, tekrar ve deneme geri bildirimiyle karışıklık olmadan takip etmek için uygulanabilir yöntem.',
    summary: 'Uzun konu listelerini ezberlemek yerine her konunun mevcut durumunu ve sonraki açık eylemini görünür tut.',
    answer: 'YKS konu takibi için her konuyu “başlanmadı”, “devam ediyor” veya “tamamlandı” gibi anlaşılır bir durumda tut; tamamlanmayı yalnızca ilk anlatımı bitirmek olarak değil, soru pratiğiyle doğrulanan bir aşama olarak kullan. Tekrar gerekiyorsa bunu konu durumundan ayrı ve açık bir görev olarak planla.',
    publishedAt: '2026-08-27',
    updatedAt: '2026-08-27',
    sections: [
      {
        title: 'Durumların anlamını baştan belirle',
        table: {
          headers: ['Durum', 'Pratik anlamı', 'Sonraki eylem'],
          rows: [
            ['Başlanmadı', 'Konu için henüz kayıtlı çalışma yok', 'İlk çalışma bloğunu planla'],
            ['Devam ediyor', 'Anlatım veya soru pratiği sürüyor', 'Eksik alt başlığı tamamla'],
            ['Tamamlandı', 'Belirlediğin öğrenme ölçütü karşılandı', 'Gerekirse ayrıca tekrar planla'],
          ],
        },
        paragraphs: ['Calisiyo’da konu durumunu değiştirmek, kendiliğinden bir tekrar görevi üretmez. Tekrar ihtiyacı varsa “Tekrar planla” eylemiyle ayrı bir kayıt oluşturmak konu ilerlemesi ile takvimi birbirine karıştırmaz.'],
      },
      {
        title: '“Tamamlandı” ölçütünü fazla gevşek tutma',
        paragraphs: ['Bir videoyu izlemek veya notu okumak tek başına tamamlanma ölçütü olmak zorunda değildir. Örneğin konu özeti çıkarma, belirli sayıda karışık soru çözme ve temel yanlışları açıklayabilme gibi kendi ölçütünü belirle. Ölçüt dersin niteliğine göre değişebilir.'],
        checklist: ['Temel kavramları açıklayabiliyor musun?', 'Temsilî soru tiplerini yardım almadan çözebiliyor musun?', 'Yanlışların bilgi eksiği mi, işlem/dikkat hatası mı?', 'Denemede aynı konu yeniden sorun çıkarıyor mu?'],
      },
      {
        title: 'Tekrarı otomatik takvim kalabalığına dönüştürme',
        paragraphs: ['Her tamamlanan konu için otomatik ve aynı aralıklı tekrar üretmek, gerçek ihtiyacı göstermeyen uzun bir liste oluşturabilir. Deneme yanlışı, unutma belirtisi veya planlı periyodik kontrol olduğunda tekrarı açıkça ekle. Böylece konu durumu ile tekrar takvimi bağımsız kalır.'],
      },
      {
        title: 'Haftalık planda konu takibini kullan',
        steps: [
          ['1', 'Devam edenleri filtrele', 'Önce yarım kalan ve sınavda etkisi yüksek konuları gör.'],
          ['2', 'Deneme geri bildirimini ekle', 'Yanlış çıkan konuyu mevcut durumuyla karşılaştır.'],
          ['3', 'Sınırlı öncelik seç', 'Bir haftaya gerçek kapasitenin üzerinde konu yükleme.'],
          ['4', 'Durumu çalışmadan sonra güncelle', 'Planlandığı için değil, gerçekten uygulandığı için değiştir.'],
        ],
      },
    ],
    sources: [],
    related: ['yks-calisma-programi', 'yks-deneme-analizi'],
    cta: { label: 'Konu ilerlemeni düzenlemeye başla', href: '/kayit' },
  },
  {
    slug: 'yks-calisma-suresi-takibi',
    kicker: 'Çalışma kaydı rehberi',
    title: 'YKS çalışma süresi nasıl takip edilir?',
    description: 'Kronometre ve manuel çalışma kayıtlarını tutarlı kullanmak, süreyi doğru yorumlamak ve günlük çalışma ritmini görmek için rehber.',
    summary: 'Masada geçirilen tahmini zamanı değil, gerçekten tamamlanan çalışma aralıklarını kaydet ve süreyi üretilen çıktıyla birlikte yorumla.',
    answer: 'Çalışma süresi takibinde başlangıç ve bitişi gerçek zamana göre kaydet, ara verdiğinde Kronometreyi durdur ve manuel kayıt ekliyorsan yalnızca tamamlanan süreyi yaz. Aynı çalışmayı hem görev hem manuel kayıt olarak iki kez saymayan ortak bir kayıt düzeni kullan.',
    publishedAt: '2026-08-27',
    updatedAt: '2026-08-27',
    sections: [
      {
        title: 'Kronometre mi, manuel kayıt mı?',
        table: {
          headers: ['Durum', 'Uygun kayıt yöntemi'],
          rows: [
            ['Çalışmaya şimdi başlıyorsun', 'Kronometreyi başlat; ara verdiğinde duraklat'],
            ['Daha önce tamamladığın süreyi ekliyorsun', 'Ders, konu ve gerçek dakika ile manuel kayıt oluştur'],
            ['Planlı görev tamamlandı', 'Görevin tamamlanma durumunu güncelle; aynı çalışmayı tekrar manuel ekleme'],
          ],
        },
      },
      {
        title: 'Süreyi çıktıdan ayırma',
        paragraphs: ['İki saatlik çalışma tek başına neyin ilerlediğini anlatmaz. Süre kaydını ders/konu, çözülen soru veya tamamlanan görevle ilişkilendir. Böylece “çok çalıştım” hissi yerine hangi çalışma türünün sonuç ürettiğini görebilirsin.'],
        checklist: ['Ders ve konu belli mi?', 'Gerçek çalışma dakikası kaydedildi mi?', 'Varsa soru sayısı eklendi mi?', 'Aynı çalışma başka bir kayıtla tekrar sayılıyor mu?'],
      },
      {
        title: 'Günlük seri ile toplam süre çelişmemeli',
        paragraphs: ['Calisiyo’daki seri, İstanbul gün sınırına göre doğrulanmış çalışma etkinliğine dayanır ve günlük eşik en az 30 dakikadır. Aynı doğrulanmış çalışma kaynağı günlük süre, haftalık süre ve istatistiklerde de kullanılır; veri yoksa yapay süre veya seri gösterilmez.'],
        callout: 'Seri bir amaç değil, düzen göstergesidir. Eksik veya hatalı kayıt fark edersen sayıyı zorlamak yerine kaydın kaynağını düzelt.',
      },
      {
        title: 'Haftalık çalışma ritmini yorumla',
        paragraphs: ['Sadece toplam dakikaya bakmak, tüm çalışmanın tek güne yığılmasını gizleyebilir. Günlere dağılımı, en uzun çalışma gününü ve soru/konu çıktısını birlikte değerlendir. Yoğun bir günün ardından sürekli sıfır günler oluşuyorsa programın günlük kapasiteye göre yeniden dağıtılması gerekir.'],
      },
    ],
    sources: [],
    related: ['yks-calisma-programi', 'yks-deneme-analizi'],
    cta: { label: 'Gerçek çalışma kayıtlarını tutmaya başla', href: '/kayit' },
  },
]);

export const GUIDE_BY_SLUG = Object.freeze(Object.fromEntries(GUIDES.map((guide) => [guide.slug, guide])));

export const PUBLIC_INDEXABLE_ROUTES = Object.freeze([
  { path: '/', lastModified: '2026-08-27' },
  { path: '/paketler', lastModified: '2026-08-27' },
  { path: '/rehber', lastModified: CONTENT_UPDATED_AT },
  ...GUIDES.map((guide) => ({ path: `/rehber/${guide.slug}`, lastModified: guide.updatedAt })),
  { path: '/metodoloji', lastModified: CONTENT_UPDATED_AT },
  { path: '/iletisim', lastModified: '2026-08-26' },
  { path: '/gizlilik', lastModified: '2026-08-09' },
  { path: '/kvkk', lastModified: '2026-08-14' },
  { path: '/kullanim-sartlari', lastModified: '2026-08-09' },
  { path: '/cerez-politikasi', lastModified: '2026-08-13' },
  { path: '/on-bilgilendirme', lastModified: '2026-08-26' },
  { path: '/mesafeli-satis', lastModified: '2026-08-26' },
  { path: '/iptal-iade', lastModified: '2026-08-13' },
]);

export function formatEditorialDate(value) {
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${value}T00:00:00Z`));
}
