export const CONTENT_PRODUCER_RULES = Object.freeze({
  discountBps: 2000,
  firstSalesCount: 3,
  firstSalesRewardMinor: 100000,
  laterSalesRewardMinor: 50000,
  rewardHoldDays: 14,
  promoExpiry: '2028-06-25+0300',
});

export function producerRewardMinor(sequence) {
  const value = Number(sequence);
  if (!Number.isSafeInteger(value) || value < 1) return null;
  return value <= CONTENT_PRODUCER_RULES.firstSalesCount
    ? CONTENT_PRODUCER_RULES.firstSalesRewardMinor
    : CONTENT_PRODUCER_RULES.laterSalesRewardMinor;
}

export function producerDiscountMinor(listMinor) {
  if (!Number.isSafeInteger(listMinor) || listMinor <= 0) return null;
  return Math.round(listMinor * CONTENT_PRODUCER_RULES.discountBps / 10_000);
}

export function isExactProducerDiscount({ listMinor, paidMinor, discountMinor } = {}) {
  return [listMinor, paidMinor, discountMinor].every(Number.isSafeInteger)
    && listMinor > 0
    && paidMinor > 0
    && discountMinor >= 0
    && paidMinor + discountMinor === listMinor
    && discountMinor * 10_000 === listMinor * CONTENT_PRODUCER_RULES.discountBps;
}

export function validShopierProducerDiscount(discount, expectedCode) {
  return String(discount?.code || '').trim().toUpperCase() === String(expectedCode || '').trim().toUpperCase()
    && discount?.type === 'percent'
    && Number(discount?.percentOff) === CONTENT_PRODUCER_RULES.discountBps / 100
    && String(discount?.currency || '').toUpperCase() === 'TRY';
}

export function shopierProducerDiscountPayload(code) {
  const normalized = String(code || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4,24}$/.test(normalized)) throw new TypeError('invalid_producer_code');
  return {
    code: normalized,
    type: 'percent',
    percentOff: String(CONTENT_PRODUCER_RULES.discountBps / 100),
    amountMinimum: '0.00',
    currency: 'TRY',
    numAvailable: 1000000,
    expiresAt: CONTENT_PRODUCER_RULES.promoExpiry,
  };
}
