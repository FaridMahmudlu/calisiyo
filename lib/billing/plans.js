import { planPriceTry } from './pricing-catalog.mjs';

export const BILLING_PERIODS = Object.freeze({
  yks_2027: { label: '19 Ağustos 2027’ye kadar', suffix: '· tek dönem', targetYear: 2027 },
  yks_2028: { label: '2028 YKS’ye kadar', suffix: '· tek dönem', targetYear: 2028 },
  six_months: { label: 'Tarihsel 6 aylık dönem', suffix: '· eski sipariş', months: 6, targetYear: 2028, historical: true },
});

export const PLUS_VARIANTS = Object.freeze([
  {
    code: 'plus_2027',
    targetYear: 2027,
    label: 'YKS 2027',
    period: 'yks_2027',
    duration: '19 Ağustos 2027’ye kadar',
    detail: 'Sabit YKS 2027 erişim dönemi',
    price: planPriceTry('plus_2027'),
    trialDays: 7,
  },
  {
    code: 'plus_2028',
    targetYear: 2028,
    label: 'YKS 2028',
    period: 'yks_2028',
    duration: '25 Haziran 2028’e kadar',
    detail: 'Türkiye Yüzyılı Maarif Modeli müfredatı',
    price: planPriceTry('plus_2028'),
    trialDays: 7,
  },
]);

export const PUBLIC_PLANS = Object.freeze([
  {
    code: 'baslangic',
    name: 'calisiyo ücretsiz',
    tagline: 'Düzenini ücretsiz kur',
    description: 'Planlama, Kronometre ve gerçek verilerden oluşan temel ilerleme araçları.',
    price: 0,
    accent: 'mint',
    features: [
      'Günlük ve haftalık çalışma planı',
      'Kronometre ve gerçek süre kaydı',
      '30 günlük istatistik geçmişi',
      'Ayda 10 deneme kaydı',
      '1 çalışma sınıfı kurma, 3 sınıfa katılma',
    ],
  },
  {
    code: 'plus',
    name: 'calisiyo plus',
    tagline: 'Hazırlığını kesintisiz büyüt',
    description: 'Sınav yılını seç; geniş limitleri ve tüm gelişim araçlarını 7 gün ücretsiz dene.',
    accent: 'blue',
    popular: true,
    variants: PLUS_VARIANTS,
    features: [
      'Ücretsiz plandaki her şey',
      'Sınırsız istatistik geçmişi ve CSV aktarımı',
      'Ayda 120 deneme ve 30 YouTube planı',
      '10 sınıf kurma, 30 sınıfa katılma',
      'Gelişmiş çalışma sınıfı ve avatar özellikleri',
    ],
  },
]);

export const LEGAL_DOCUMENT_VERSIONS = Object.freeze({
  on_bilgilendirme: '2026-08-25',
  mesafeli_satis: '2026-08-25',
  iptal_iade: '2026-08-25',
  kvkk: '2026-09-03',
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

export function getBillingVariant(code) {
  return PLUS_VARIANTS.find((variant) => variant.code === code) || null;
}

export function getVariantForYear(year) {
  return PLUS_VARIANTS.find((variant) => variant.targetYear === Number(year)) || PLUS_VARIANTS[0];
}

export function getPublicPlan(code) {
  if (code === 'baslangic') return PUBLIC_PLANS[0];
  const variant = getBillingVariant(code);
  if (variant) return { ...PUBLIC_PLANS[1], ...variant, productCode: 'plus' };
  return PUBLIC_PLANS[0];
}

export function getPlanPrice(code) {
  if (code === 'baslangic') return 0;
  return getBillingVariant(code)?.price || 0;
}

export function formatTry(value) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: Number(value) % 1 === 0 ? 0 : 2,
  }).format(Number(value || 0));
}
