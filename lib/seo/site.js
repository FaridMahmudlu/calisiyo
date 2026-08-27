const FALLBACK_ORIGIN = 'https://calisiyo-theta.vercel.app';

function normalizeOrigin(value) {
  try {
    const url = new URL(value || FALLBACK_ORIGIN);
    if (!['http:', 'https:'].includes(url.protocol)) return FALLBACK_ORIGIN;
    return url.origin;
  } catch {
    return FALLBACK_ORIGIN;
  }
}

export const SITE = Object.freeze({
  name: 'calisiyo',
  title: 'calisiyo · YKS Çalışma Koçu',
  origin: normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL),
  language: 'tr-TR',
  locale: 'tr_TR',
  description: 'YKS çalışma planını oluştur, Kronometre ile çalış, konu ve deneme takibini gerçek çalışma kayıtlarınla tek yerde yönet.',
  supportEmail: 'calisiyo.destek@gmail.com',
  logoPath: '/brand/calisiyo-mark-512.png',
  socialImagePath: '/brand/og-image.png',
});

export function absoluteUrl(path = '/') {
  return new URL(path, `${SITE.origin}/`).toString();
}
