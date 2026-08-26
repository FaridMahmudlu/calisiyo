import 'server-only';
import { shopierConfigurationProblems } from './providers/shopier';

export const PUBLIC_CONTACT = Object.freeze({
  phoneDisplay: '+90 555 049 73 60',
  phoneHref: '+905550497360',
  address: 'ATATÜRK MAH. 01117 NOLU SK. ZİRVE SİTESİ A BLOK NO:2 İÇ KAPI NO:11 ŞEHİTKAMİL / GAZİANTEP',
  supportEmail: 'calisiyo.destek@gmail.com',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://calisiyo-theta.vercel.app',
});

export function getLegalBusinessConfig() {
  return {
    legalName: String(process.env.CALISIYO_LEGAL_NAME || '').trim(),
    taxOrMersis: String(process.env.CALISIYO_TAX_OR_MERSIS_NUMBER || '').trim(),
    ...PUBLIC_CONTACT,
    supportEmail: String(process.env.CALISIYO_SUPPORT_EMAIL || PUBLIC_CONTACT.supportEmail).trim(),
  };
}

export function getBillingReadiness() {
  const legal = getLegalBusinessConfig();
  const missing = [];
  if (!/^\S+@\S+\.\S+$/.test(legal.supportEmail)) missing.push('destek e-postası');
  missing.push(...shopierConfigurationProblems());
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push('Supabase servis anahtarı');

  return {
    ready: missing.length === 0,
    missing,
    environment: 'production',
    provider: 'shopier',
  };
}
