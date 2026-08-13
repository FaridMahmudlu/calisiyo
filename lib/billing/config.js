import 'server-only';

export const PUBLIC_CONTACT = Object.freeze({
  phoneDisplay: '+90 555 049 73 60',
  phoneHref: '+905550497360',
  address: 'ATATÜRK MAH. 01117 NOLU SK. ZİRVE SİTESİ A BLOK NO:2 İÇ KAPI NO:11 ŞEHİTKAMİL / GAZİANTEP',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://calisiyo-theta.vercel.app',
});

export function getLegalBusinessConfig() {
  return {
    legalName: String(process.env.CALISIYO_LEGAL_NAME || '').trim(),
    taxOrMersis: String(process.env.CALISIYO_TAX_OR_MERSIS_NUMBER || '').trim(),
    supportEmail: String(process.env.CALISIYO_SUPPORT_EMAIL || '').trim(),
    ...PUBLIC_CONTACT,
  };
}

export function getBillingReadiness() {
  const legal = getLegalBusinessConfig();
  const missing = [];
  if (!legal.legalName) missing.push('ticari unvan');
  if (!legal.taxOrMersis) missing.push('vergi veya MERSİS numarası');
  if (!/^\S+@\S+\.\S+$/.test(legal.supportEmail)) missing.push('destek e-postası');
  if (!process.env.IYZICO_API_KEY) missing.push('İyzico API anahtarı');
  if (!process.env.IYZICO_SECRET_KEY) missing.push('İyzico gizli anahtarı');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push('Supabase servis anahtarı');

  return {
    ready: missing.length === 0,
    missing,
    environment: process.env.IYZICO_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
  };
}
