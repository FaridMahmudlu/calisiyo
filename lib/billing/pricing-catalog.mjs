export const PLAN_PRICE_MINOR = Object.freeze({
  plus_2027: 250000,
  plus_2028: 450000,
});

export function planPriceMinor(planCode) {
  return PLAN_PRICE_MINOR[planCode] || 0;
}

export function planPriceTry(planCode) {
  return planPriceMinor(planCode) / 100;
}
