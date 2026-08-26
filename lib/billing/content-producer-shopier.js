import 'server-only';
import { configuredShopierClient } from './providers/shopier';
import { shopierProducerDiscountPayload, validShopierProducerDiscount } from './content-producer.mjs';

export function safePromoErrorCode(error, fallback = 'shopier_promo_failed') {
  return String(error?.safeCode || error?.code || fallback)
    .toLowerCase().replace(/[^a-z0-9_:-]/g, '_').slice(0, 80);
}

export async function findShopierDiscount(client, code) {
  for (let page = 1; page <= 5; page += 1) {
    const discounts = await client.listDiscountCodes({ limit: 50, page, sort: 'dateDesc' });
    const match = (Array.isArray(discounts) ? discounts : [])
      .find((item) => String(item?.code || '').toUpperCase() === code);
    if (match || !Array.isArray(discounts) || discounts.length < 50) return match || null;
  }
  return null;
}

export async function provisionProducerPromo(code) {
  const expectedCode = String(code || '').trim().toUpperCase();
  const client = configuredShopierClient({ timeoutMs: 10_000 });
  let discount = await findShopierDiscount(client, expectedCode);
  let created = false;
  if (discount && !validShopierProducerDiscount(discount, expectedCode)) {
    const error = new Error('promo_conflict');
    error.safeCode = 'promo_conflict';
    error.reviewRequired = true;
    throw error;
  }
  if (!discount) {
    try {
      discount = await client.createDiscountCode(shopierProducerDiscountPayload(expectedCode));
      created = true;
    } catch (error) {
      discount = await findShopierDiscount(client, expectedCode);
      if (!discount) throw error;
    }
  }
  if (!discount?.id || !validShopierProducerDiscount(discount, expectedCode)) {
    const error = new Error('promo_response_mismatch');
    error.safeCode = 'promo_response_mismatch';
    error.reviewRequired = true;
    throw error;
  }
  return { discount, created };
}

export async function deleteProducerPromo(providerDiscountId) {
  const id = String(providerDiscountId || '').trim();
  if (!id) return { required: false, disabled: true };
  try {
    await configuredShopierClient({ timeoutMs: 10_000 }).deleteDiscountCode(id);
    return { required: true, disabled: true };
  } catch (error) {
    if (error?.status === 404) return { required: true, disabled: true, alreadyMissing: true };
    throw error;
  }
}
