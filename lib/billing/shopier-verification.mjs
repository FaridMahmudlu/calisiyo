import { moneyToMinorUnits, normalizeEmail } from './shopier-core.mjs';

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function customerEmail(order) {
  const shipping = normalizeEmail(asRecord(order.shippingInfo).email);
  const billing = normalizeEmail(asRecord(order.billingInfo).email);
  if (shipping && billing && shipping !== billing) {
    return { email: null, reason: 'customer_email_ambiguous' };
  }
  const email = billing || shipping;
  return email
    ? { email, reason: null }
    : { email: null, reason: 'customer_email_missing' };
}

export function normalizeShopierOrder(order) {
  const source = asRecord(order);
  const items = Array.isArray(source.lineItems) ? source.lineItems.map(asRecord) : [];
  const totals = asRecord(source.totals);
  const discounts = Array.isArray(source.discounts) ? source.discounts.map(asRecord) : [];
  const emailResult = customerEmail(source);
  return {
    id: String(source.id || '').trim(),
    paymentStatus: String(source.paymentStatus || '').trim().toLowerCase(),
    fulfillmentStatus: String(source.status || '').trim().toLowerCase(),
    currency: String(source.currency || '').trim().toUpperCase(),
    dateCreated: String(source.dateCreated || '').trim(),
    email: emailResult.email,
    emailReason: emailResult.reason,
    totalMinor: moneyToMinorUnits(totals.total),
    subtotalMinor: moneyToMinorUnits(totals.subtotal),
    shippingMinor: moneyToMinorUnits(totals.shipping),
    discountMinor: moneyToMinorUnits(totals.discount),
    discounts: discounts.map((discount) => ({
      id: String(discount.id || '').trim(),
      method: String(discount.method || '').trim(),
    })),
    items: items.map((item) => ({
      productId: String(item.productId || '').trim(),
      quantity: Number(item.quantity),
      priceMinor: moneyToMinorUnits(item.price),
      totalMinor: moneyToMinorUnits(item.total),
    })),
  };
}

export function validateShopierOrder(order, expected) {
  const normalized = normalizeShopierOrder(order);
  const expectedEmail = normalizeEmail(expected?.customerEmail);
  const expectedMinor = moneyToMinorUnits(expected?.amount);
  const expectedListMinor = moneyToMinorUnits(expected?.listAmount ?? expected?.amount);
  const expectedProductId = String(expected?.productId || '').trim();
  const expectedDiscountId = String(expected?.providerDiscountId || '').trim();
  const hasDiscount = Number(normalized.discountMinor || 0) > 0;

  let reason = null;
  if (!normalized.id) reason = 'provider_order_id_missing';
  else if (normalized.paymentStatus !== 'paid') reason = 'payment_not_paid';
  else if (normalized.currency !== 'TRY') reason = 'currency_mismatch';
  else if (expectedMinor === null || normalized.totalMinor !== expectedMinor) reason = 'amount_mismatch';
  else if (expectedListMinor === null || normalized.subtotalMinor !== expectedListMinor) reason = 'subtotal_mismatch';
  else if (normalized.discountMinor !== expectedListMinor - expectedMinor) reason = 'discount_amount_mismatch';
  else if (hasDiscount && normalized.discounts.length !== 1) reason = 'discount_count_mismatch';
  else if (hasDiscount && normalized.discounts[0].method !== 'discountCode') reason = 'discount_method_mismatch';
  else if (hasDiscount && (!expectedDiscountId || normalized.discounts[0].id !== expectedDiscountId)) reason = 'discount_binding_mismatch';
  else if (!hasDiscount && normalized.discounts.length) reason = 'unexpected_discount';
  else if (normalized.shippingMinor !== 0) reason = 'unexpected_shipping_amount';
  else if (normalized.items.length !== 1) reason = 'line_item_count_mismatch';
  else if (normalized.items[0].productId !== expectedProductId) reason = 'product_mismatch';
  else if (normalized.items[0].quantity !== 1) reason = 'quantity_mismatch';
  else if (normalized.items[0].totalMinor !== expectedListMinor) reason = 'line_total_mismatch';
  else if (normalized.emailReason) reason = normalized.emailReason;
  else if (!expectedEmail || normalized.email !== expectedEmail) reason = 'customer_email_mismatch';

  return { ok: !reason, reason, order: normalized };
}

export function normalizeShopierRefund(refund) {
  const source = asRecord(refund);
  return {
    id: String(source.id || '').trim(),
    orderId: String(source.orderId || '').trim(),
    type: String(source.type || '').trim().toLowerCase(),
    status: String(source.status || '').trim().toLowerCase(),
    currency: String(source.currency || '').trim().toUpperCase(),
    totalMinor: moneyToMinorUnits(source.total),
    dateCreated: String(source.dateCreated || '').trim(),
    dateRefunded: String(source.dateRefunded || '').trim(),
  };
}

export function validateShopierRefund(refund, expected) {
  const normalized = normalizeShopierRefund(refund);
  const expectedMinor = moneyToMinorUnits(expected?.amount);
  let reason = null;
  if (!normalized.id || !normalized.orderId) reason = 'refund_identity_missing';
  else if (!['full', 'partial'].includes(normalized.type)) reason = 'refund_type_unsupported';
  else if (!['pending', 'failed', 'succeeded'].includes(normalized.status)) reason = 'refund_status_unsupported';
  else if (normalized.currency !== 'TRY') reason = 'refund_currency_mismatch';
  else if (expectedMinor === null || normalized.totalMinor === null || normalized.totalMinor <= 0) {
    reason = 'refund_amount_invalid';
  } else if (normalized.totalMinor > expectedMinor) reason = 'refund_amount_exceeds_order';
  else if (normalized.type === 'full' && normalized.totalMinor !== expectedMinor) reason = 'refund_total_mismatch';
  return { ok: !reason, reason, refund: normalized };
}
