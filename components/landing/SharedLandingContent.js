import {
  PiArrowRight, PiCalendarCheck, PiChartLineUp,
  PiCheck, PiClockCountdown, PiCompass, PiListChecks, PiLockKey,
  PiPlayCircle, PiSparkle, PiTarget, PiTimer,
} from 'react-icons/pi';

/* ═══════════════════════════════════════════
   SINGLE SOURCE OF TRUTH — all landing page
   copy, links, CTAs, and data live here so
   the 3D and lightweight paths can't drift.
   ═══════════════════════════════════════════ */

export const NAV_LINKS = [
  { label: 'Çalışma yolu', href: '#yolculuk' },
  { label: 'Araçlar', href: '#araclar' },
  { label: 'Nasıl çalışır?', href: '#rehber' },
  { label: 'Paketler', href: '#paketler' },
];

export const HERO = {
  kicker: 'YKS çalışma yolun',
  KickerIcon: PiSparkle,
  headline: 'Dağınık çalışmayı',
  headlineEm: 'net bir yola',
  headlineSuffix: 'dönüştür.',
  description: 'Bugün ne yapacağını bil, odaklanarak çalış ve gelişimini yalnızca kendi gerçek kayıtlarından takip et.',
  ctaPrimary: { label: 'Ücretsiz başla', href: '/kayit', Icon: PiArrowRight },
  ctaSecondary: { label: 'Nasıl çalışır?', href: '#yolculuk', Icon: PiPlayCircle },
  trustBadges: [
    { Icon: PiCheck, text: 'Kredi kartı gerekmez' },
    { Icon: PiCheck, text: 'Telefon ve bilgisayarda uyumlu' },
  ],
  CountdownIcon: PiClockCountdown,
  countdownSuffix: 'gün',
  countdownLabel: 'Tahmini YKS tarihi',
  heroImage: '/assets/landing/study-path-hero.webp',
  heroImageAlt: 'Planlamadan YKS zirvesine uzanan 3D çalışma yolu',
  milestones: [
    { number: '01', label: 'Planla', className: 'is-plan' },
    { number: '02', label: 'Odaklan', className: 'is-focus' },
    { number: '03', label: 'İlerle', className: 'is-progress' },
  ],
};

export const STORY_INTRO = {
  kicker: 'Kaydırdıkça çalışma yolunu keşfet',
  headline: 'Planından YKS hedefine kadar tek, bağlı bir akış.',
  description: 'Her kayıt bir sonraki ekranı günceller. Aynı bilgiyi farklı yerlere tekrar yazmadan nerede olduğunu görürsün.',
  route: ['Planla', 'Odaklan', 'İlerle'],
};

export const STORY_CHAPTERS = [
  {
    id: 'planla',
    number: '01',
    eyebrow: 'Planla',
    title: 'Bugün ne yapacağını bil.',
    text: 'Dersini, konunu, başlama saatini, süreni ve soru hedefini tek bir akışta planla. Günlük ve haftalık görünüm aynı kayıtlardan beslenir.',
    image: '/assets/landing/study-path-plan.webp',
    alt: 'Ajanda, kitaplar ve planlama kontrol noktalarıyla 3D çalışma yolu',
    facts: [['08:00', 'Paragraf · 40 dk'], ['11:00', 'TYT Matematik · 60 dk'], ['15:00', 'Fizik · 40 dk']],
    Icon: PiCalendarCheck,
    color: '#00a870',
  },
  {
    id: 'odaklan',
    number: '02',
    eyebrow: 'Odaklan',
    title: 'Süreyi gerçekten çalışmaya dönüştür.',
    text: 'Pomodoro ile kesintisiz bir çalışma oturumu başlat. Tamamlanan süre doğrudan çalışma kaydına, istatistiklerine ve günlük seri hedefine yansır.',
    image: '/assets/landing/study-path-focus.webp',
    alt: '25 dakikalık odak zamanlayıcısı, kulaklık ve masa lambasıyla 3D çalışma sahnesi',
    facts: [['25:00', 'Odak'], ['05:00', 'Kısa mola'], ['30 dk', 'Günlük seri eşiği']],
    Icon: PiTimer,
    color: '#3b82f6',
  },
  {
    id: 'ilerle',
    number: '03',
    eyebrow: 'İlerle',
    title: 'Bir sonraki doğru adımı verilerinle gör.',
    text: 'Süre, soru, konu ve deneme kayıtlarını birlikte incele. İstatistikler hazır başarı oranlarından değil, yalnızca kendi gerçek çalışmalarından hesaplanır.',
    image: '/assets/landing/study-path-progress.webp',
    alt: 'İlerleme çubukları, kontrol noktaları ve YKS zirvesiyle 3D çalışma yolu',
    facts: [['Süre', 'Günlük ve haftalık toplam'], ['Soru', 'Ders ve konu dağılımı'], ['Deneme', 'Net ve süre karşılaştırması']],
    Icon: PiChartLineUp,
    color: '#8b5cf6',
  },
];

export const CAPABILITIES = [
  { label: 'Günlük ve haftalık program', Icon: PiCalendarCheck },
  { label: 'Konu ve tekrar takibi', Icon: PiListChecks },
  { label: 'Pomodoro ve süre kaydı', Icon: PiTimer },
  { label: 'Deneme analizi', Icon: PiTarget },
  { label: 'Gerçek çalışma istatistikleri', Icon: PiChartLineUp },
  { label: 'Kişisel YKS hedefleri', Icon: PiCompass },
];

export const CAPABILITIES_SECTION = {
  kicker: 'Birbirini tamamlayan araçlar',
  headline: 'Paneldeki bütün işlevler, daha anlaşılır bir düzende.',
  description: 'Plan, konu, deneme, tekrar, kaynak, not, hedef ve istatistik kayıtları aynı hesabın içinde birlikte çalışır.',
};

export const GUIDE = {
  kicker: 'İlk 10 dakikan',
  headline: 'Teknik ayar yok. Çalışma var.',
  description: 'Hesabını açtıktan sonra alanını seçer, ilk planını kurar ve gerçek çalışma verini oluşturmaya başlarsın.',
  cta: { label: 'İlk planını oluştur', href: '/kayit', Icon: PiArrowRight },
  steps: [
    { number: '1', title: 'Alanını seç', text: 'Sayısal, eşit ağırlık, sözel veya dil görünümünü hazırla.' },
    { number: '2', title: 'Görevini ekle', text: 'Ders, konu, saat, süre ve soru hedefini belirle.' },
    { number: '3', title: 'Çalış ve kaydet', text: 'Pomodoro veya çalışma kaydı ile süreyi ilerlemene ekle.' },
    { number: '4', title: 'Sonraki adımı gör', text: 'Tekrar, konu ve deneme verilerine göre devam et.' },
  ],
};

export const REAL_DATA_CARDS = [
  {
    Icon: PiLockKey,
    headline: 'Çalışma alanın hesabına özeldir.',
    text: 'Program, deneme, not, kaynak ve soru kayıtların yalnızca kendi hesabına bağlı tutulur.',
  },
  {
    Icon: PiChartLineUp,
    headline: 'İstatistikler gerçek kayıtlarından doğar.',
    text: 'Veri eklemediğinde yapay başarı oranı gösterilmez; sonuçlar çalıştıkça oluşur.',
  },
];

export const FINAL_CTA = {
  kicker: 'Yolun bugün başlıyor',
  headline: 'Bir sonraki çalışmanı şansa bırakma.',
  description: 'Planını oluştur, 30 dakikalık seri hedefini tamamla ve YKS yolunu kendi verilerinle yönet.',
  cta: { label: 'Ücretsiz başla', href: '/kayit', Icon: PiArrowRight },
};

export const FOOTER = {
  tagline: 'YKS hazırlığını net bir çalışma yoluna dönüştür.',
  productLinks: [
    { label: 'Çalışma yolu', href: '#yolculuk' },
    { label: 'Araçlar', href: '#araclar' },
    { label: 'Başlangıç rehberi', href: '#rehber' },
    { label: 'Paketler ve fiyatlar', href: '/paketler' },
  ],
  accountLinks: [
    { label: 'Giriş yap', href: '/giris', internal: true },
    { label: 'Ücretsiz hesap oluştur', href: '/kayit', internal: true },
  ],
  legalLinks: [
    { label: 'Gizlilik Politikası', href: '/gizlilik', internal: true },
    { label: 'KVKK Aydınlatma Metni', href: '/kvkk', internal: true },
    { label: 'Kullanım Şartları', href: '/kullanim-sartlari', internal: true },
    { label: 'Ön Bilgilendirme', href: '/on-bilgilendirme', internal: true },
    { label: 'Mesafeli Satış Sözleşmesi', href: '/mesafeli-satis', internal: true },
    { label: 'İptal ve İade', href: '/iptal-iade', internal: true },
    { label: 'Çerez Politikası', href: '/cerez-politikasi', internal: true },
    { label: 'İletişim', href: '/iletisim', internal: true },
  ],
  copyright: '© 2026 calisiyo · YKS Çalışma Koçu',
};
