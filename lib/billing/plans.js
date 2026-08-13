export const BILLING_PERIODS = Object.freeze({
  monthly: { label: '30 gün', suffix: '/ 30 gün', days: 30 },
  annual: { label: '365 gün', suffix: '/ 365 gün', days: 365 },
});

export const PUBLIC_PLANS = Object.freeze([
  {
    code: 'baslangic',
    name: 'Başlangıç',
    tagline: 'Düzenini kur',
    description: 'Planlama, Pomodoro ve gerçek verilerden oluşan temel ilerleme araçları.',
    monthlyPrice: 0,
    annualPrice: 0,
    accent: 'mint',
    features: [
      'Günlük ve haftalık çalışma planı',
      'Pomodoro ve süre kaydı',
      '30 günlük istatistik geçmişi',
      'Ayda 10 deneme kaydı',
      '1 sınıf kurma, 3 sınıfa katılma',
    ],
  },
  {
    code: 'odak',
    name: 'Odak',
    tagline: 'Ritmini büyüt',
    description: 'Yoğun çalışan öğrenciler için geniş limitler, sınıf kurma ve ayrıntılı takip.',
    monthlyPrice: 89.9,
    annualPrice: 899,
    accent: 'blue',
    popular: true,
    features: [
      'Başlangıç planındaki her şey',
      '3 çalışma sınıfı kurma, 8 sınıfa katılma',
      'Gelişmiş avatar özelleştirme',
      'Sınırsız istatistik geçmişi',
      'Ayda 40 deneme ve 5 YouTube planı',
    ],
  },
  {
    code: 'zirve',
    name: 'Zirve',
    tagline: 'Tam kontrol sende',
    description: 'En yüksek limitler, dışa aktarma ve çoklu çalışma sınıfı yönetimi.',
    monthlyPrice: 149.9,
    annualPrice: 1499,
    accent: 'purple',
    features: [
      'Odak planındaki her şey',
      '10 çalışma sınıfı kurma, 30 sınıfa katılma',
      '50 kişilik çalışma sınıfları',
      'Gelişim raporunu dışa aktarma',
      'Ayda 120 deneme ve 30 YouTube planı',
    ],
  },
]);

export const LEGAL_DOCUMENT_VERSIONS = Object.freeze({
  on_bilgilendirme: '2026-08-13',
  mesafeli_satis: '2026-08-13',
  iptal_iade: '2026-08-13',
  kvkk: '2026-08-13',
});

export const ENTITLEMENT_LABELS = Object.freeze({
  future_schedule_days: 'İleri tarihli planlama',
  active_task_limit: 'Aktif görev',
  exam_monthly_limit: 'Aylık deneme kaydı',
  note_limit: 'Not defteri kaydı',
  youtube_import_monthly_limit: 'Aylık YouTube planı',
  classroom_create_limit: 'Kurulabilen sınıf',
  classroom_join_limit: 'Katılınabilen sınıf',
  classroom_member_limit: 'Sınıf üye kapasitesi',
  stats_history_days: 'İstatistik geçmişi',
});

export function getPublicPlan(code) {
  return PUBLIC_PLANS.find((plan) => plan.code === code) || PUBLIC_PLANS[0];
}

export function formatTry(value) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: Number(value) % 1 === 0 ? 0 : 2,
  }).format(Number(value || 0));
}
