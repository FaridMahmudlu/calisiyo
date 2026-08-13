import 'server-only';
import { createHash } from 'node:crypto';
import { LEGAL_DOCUMENT_VERSIONS } from './plans';
import { getLegalBusinessConfig } from './config';

export function createLegalSnapshot({ planCode, planName, billingPeriod, amount, orderNumber }) {
  const business = getLegalBusinessConfig();
  const snapshot = {
    versions: LEGAL_DOCUMENT_VERSIONS,
    seller: {
      legalName: business.legalName,
      taxOrMersis: business.taxOrMersis,
      supportEmail: business.supportEmail,
      phone: business.phoneDisplay,
      address: business.address,
    },
    order: { planCode, planName, billingPeriod, amount, currency: 'TRY', orderNumber },
    terms: {
      autoRenewal: false,
      delivery: 'Ödeme doğrulamasından sonra dijital erişim etkinleştirilir.',
      withdrawal: 'Tüketicinin açık onayıyla anında ifasına başlanan dijital hizmetlerde cayma hakkı istisnası uygulanabilir.',
    },
  };
  const serialized = JSON.stringify(snapshot);
  return {
    snapshot,
    hash: createHash('sha256').update(serialized).digest('hex'),
  };
}
