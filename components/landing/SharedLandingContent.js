export const NAV_LINKS = [
  { label: 'Özellikler', href: '#ozellikler' },
  { label: 'Deneme analizi', href: '#deneme-analizi' },
  { label: 'Nasıl çalışır?', href: '#nasil-calisir' },
  { label: 'Paketler', href: '#paketler' },
  { label: 'Rehber', href: '/rehber' },
];

export const SUPPORTED_EXAMS = ['TYT', 'AYT', 'YDT', 'KDS', 'SDS', 'LGS', 'KPSS', 'ALES', 'DGS', 'YDS', 'YÖKDİL', 'MSÜ'];

// Direct, self-contained answers: rendered on the page and reused for FAQPage
// structured data so search and answer engines can quote them verbatim.
export const FAQS = [
  { question: 'Planliyo nedir?', answer: 'Planliyo; YKS çalışma programını, kronometre kayıtlarını, konu takibini, deneme analizini ve kişisel istatistikleri tek çalışma alanında birleştiren bir çalışma planlama uygulamasıdır. Web’de ve Android’de aynı hesapla çalışır.' },
  { question: 'YKS çalışma planı nasıl oluşturulur?', answer: 'Alanını (sayısal, eşit ağırlık, sözel veya dil) ve sınav yılını seçtikten sonra ders, konu, tarih, başlangıç saati, süre ve soru hedefini eklersin. Günlük ve haftalık program aynı görevlerden otomatik olarak güncellenir.' },
  { question: 'Hangi sınavların denemelerini kaydedebilirim?', answer: 'TYT, AYT ve YDT’nin yanında KDS, SDS, LGS, KPSS Genel Yetenek-Genel Kültür, ALES, DGS, YDS, YÖKDİL ve MSÜ denemelerini kaydedebilirsin. Listede olmayan bir deneme için bölümleri ve soru sayılarını kendin tanımlayabilirsin.' },
  { question: 'KDS ve SDS denemelerimi nasıl takip ederim?', answer: 'Deneme Analizi’nde KDS veya SDS’yi seçip sınıf düzeyini belirlersin. Dersler ve soru sayıları yayına göre düzenlenebilir; Planliyo neti seçtiğin yanlış kuralıyla hesaplar ve bir sonraki kayıtta aynı düzeni hatırlar.' },
  { question: 'Net nasıl hesaplanır?', answer: 'YKS, KPSS, ALES, DGS ve MSÜ’de doğru sayısından yanlış sayısının dörtte biri çıkarılır; örneğin 30 doğru ve 8 yanlış 28 net eder. LGS’de 3 yanlış 1 doğruyu götürür, YDS ve YÖKDİL’de yanlışlar doğruyu götürmez. Planliyo her sınav için doğru kuralı otomatik uygular.' },
  { question: 'Farklı sınavların sonuçları nasıl karşılaştırılır?', answer: 'Soru sayıları farklı olduğu için genel görünümde netin soru sayısına oranı (başarı yüzdesi) karşılaştırılır. Ham net gelişimi, ortalama, rekor ve ders bazında analiz her sınavın kendi sekmesinde ayrı ayrı gösterilir.' },
  { question: 'Kronometre kaydı istatistiklere yansır mı?', answer: 'Evet. Tamamladığın kronometre ve çalışma kayıtları süre ve günlük seri hesaplarına eklenir; istatistikler yalnızca kaydettiğin gerçek çalışmalardan oluşur.' },
  { question: 'Planliyo ücretsiz mi?', answer: 'planliyo ücretsiz; günlük planlama, kronometre, temel istatistikler, deneme kaydı ve çalışma sınıfı özelliklerini belirli limitlerle içerir. Kredi kartı gerekmez.' },
  { question: 'planliyo plus ne sağlar?', answer: 'planliyo plus; sınırsız istatistik geçmişi ve CSV aktarımıyla daha yüksek deneme, not, YouTube planı ve çalışma sınıfı limitleri sunar. YKS 2027 veya YKS 2028 seçeneğini 7 gün ücretsiz deneyebilirsin; otomatik yenileme yoktur.' },
  { question: 'Planliyo’nun mobil uygulaması var mı?', answer: 'Android uygulaması test aşamasında ve yakında Google Play’de yayınlanacak. Uygulamada kronometre kilit ekranında canlı geri sayar ve ana ekran widget’ları sıradaki görevini gösterir. Web sürümünü bugün telefon tarayıcından kullanabilirsin; hesabın ve verilerin her yerde aynıdır.' },
  { question: 'Çalışma verilerim güvende mi?', answer: 'Çalışma kayıtların hesabına bağlı tutulur ve başka kullanıcıların özel verilerine erişmesini engelleyen satır düzeyi yetkilendirme kurallarıyla korunur. Verilerini dışa aktarabilir veya hesabınla birlikte kalıcı olarak silebilirsin.' },
];

export const FOOTER = {
  tagline: 'YKS’ye ve okul sınavlarına hazırlığını planla, odaklan ve kendi çalışma verilerinle ilerle.',
  productLinks: [
    { label: 'Özellikler', href: '/ozellikler' },
    { label: 'Deneme analizi', href: '/#deneme-analizi' },
    { label: 'Paketler ve fiyatlar', href: '/paketler' },
    { label: 'YKS çalışma rehberi', href: '/rehber' },
    { label: 'Veri metodolojisi', href: '/metodoloji' },
    { label: 'Hakkımızda', href: '/hakkimizda' },
    { label: 'Sık sorulan sorular', href: '/#sss' },
  ],
  accountLinks: [{ label: 'Giriş yap', href: '/giris' }, { label: 'Ücretsiz hesap oluştur', href: '/kayit' }],
  legalLinks: [
    { label: 'Gizlilik Politikası', href: '/gizlilik' },
    { label: 'KVKK Aydınlatma Metni', href: '/kvkk' },
    { label: 'Kullanım Şartları', href: '/kullanim-sartlari' },
    { label: 'Çerez Politikası', href: '/cerez-politikasi' },
    { label: 'Hesap silme', href: '/hesap-silme' },
    { label: 'İletişim', href: '/iletisim' },
  ],
  copyright: '© 2026 Planliyo · YKS Çalışma Koçu',
};
