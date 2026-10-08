// Shared by web and mobile so report reasons stay identical to the
// content_reports.reason check constraint.
export const REPORT_REASONS = Object.freeze([
  { value: 'spam', label: 'Spam veya reklam', description: 'İstenmeyen tekrar eden içerik, reklam veya bağlantılar' },
  { value: 'harassment', label: 'Taciz veya zorbalık', description: 'Bir kişiyi hedef alan, rahatsız eden davranışlar' },
  { value: 'hate', label: 'Nefret söylemi', description: 'Kimlik, köken veya inanç temelli aşağılama' },
  { value: 'sexual', label: 'Cinsel içerik', description: 'Uygunsuz veya müstehcen içerik' },
  { value: 'violence', label: 'Şiddet veya tehdit', description: 'Şiddet çağrısı, tehdit veya tehlikeli davranış' },
  { value: 'self_harm', label: 'Kendine zarar verme', description: 'Kendine zarar verme veya intihar ile ilgili endişe' },
  { value: 'impersonation', label: 'Kimlik taklidi', description: 'Başka biri gibi davranan hesap' },
  { value: 'other', label: 'Diğer', description: 'Kısa bir açıklama yazman gerekir' },
]);

export const REPORT_TARGET_LABELS = Object.freeze({
  message: 'Mesaj',
  user: 'Kullanıcı',
  group: 'Çalışma sınıfı',
});

export const reportReasonLabel = (value) => REPORT_REASONS.find((reason) => reason.value === value)?.label || value;
