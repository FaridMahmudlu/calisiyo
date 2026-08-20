import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  configuredShopierClient,
  shopierProductById,
} from '@/lib/billing/providers/shopier';
import {
  normalizeShopierOrder,
  validateShopierOrder,
  validateShopierRefund,
} from '@/lib/billing/shopier-verification.mjs';

const ORDER_FIELDS = [
  'id', 'user_id', 'plan_code', 'billing_period', 'amount', 'currency', 'status',
  'payment_provider', 'customer_email_snapshot', 'expected_provider_product_id',
  'provider_order_id', 'provider_checkout_url', 'provider_status', 'created_at',
].join(',');

function isPermanentProviderError(error) {
  const status = Number(error?.status || 0);
  return status >= 400 && status < 500 && status !== 408 && status !== 429;
}

function isSafeReviewDatabaseError(error) {
  return ['22023', '23505', 'P0002'].includes(String(error?.code || ''));
}

function providerDateWindow(value) {
  const created = new Date(value);
  if (!Number.isFinite(created.getTime())) return null;
  return {
    from: new Date(created.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    to: new Date(created.getTime() + 10 * 60 * 1000).toISOString(),
  };
}

async function markOrdersForReview(
  admin,
  orders,
  providerOrderId,
  providerStatus,
  reason,
  { attachProviderOrder = false } = {},
) {
  await Promise.all((orders || []).map(async (order) => {
    const { error } = await admin.rpc('mark_billing_order_for_provider_review', {
      p_order_id: order.id,
      p_provider_order_id: attachProviderOrder && orders.length === 1 ? providerOrderId : null,
      p_provider_status: providerStatus || null,
      p_reason_code: reason,
    });
    if (error) throw error;
  }));
}

async function findCandidateOrders(admin, normalized, product) {
  const window = providerDateWindow(normalized.dateCreated);
  let query = admin
    .from('billing_orders')
    .select(ORDER_FIELDS)
    .eq('payment_provider', 'shopier')
    .eq('plan_code', product.planCode)
    .eq('expected_provider_product_id', product.productId)
    .in('status', ['payment_link_ready', 'awaiting_review']);
  if (normalized.email) query = query.eq('customer_email_snapshot', normalized.email);
  else query = query.eq('customer_email_snapshot', '__no_valid_email__');
  if (window) query = query.gte('created_at', window.from).lte('created_at', window.to);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(4);
  if (error) throw error;
  return data || [];
}

async function potentialProductOrders(admin, normalized, product) {
  const window = providerDateWindow(normalized.dateCreated);
  let query = admin
    .from('billing_orders')
    .select(ORDER_FIELDS)
    .eq('payment_provider', 'shopier')
    .eq('plan_code', product.planCode)
    .eq('expected_provider_product_id', product.productId)
    .in('status', ['payment_link_ready', 'awaiting_review']);
  if (window) query = query.gte('created_at', window.from).lte('created_at', window.to);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(4);
  if (error) throw error;
  return data || [];
}

export async function verifyAndApplyShopierOrder(providerOrderId, { client, admin } = {}) {
  const shopier = client || configuredShopierClient();
  const db = admin || createAdminClient();
  let authoritative;
  try {
    authoritative = await shopier.getOrder(providerOrderId);
  } catch (error) {
    if (isPermanentProviderError(error)) {
      return { outcome: 'review_required', providerOrderId, reason: 'provider_order_unavailable' };
    }
    throw error;
  }
  const normalized = normalizeShopierOrder(authoritative);

  const { data: alreadyUsed, error: usedError } = await db
    .from('billing_orders')
    .select(ORDER_FIELDS)
    .eq('payment_provider', 'shopier')
    .eq('provider_order_id', normalized.id)
    .maybeSingle();
  if (usedError) throw usedError;
  if (alreadyUsed) {
    return {
      outcome: alreadyUsed.status === 'approved' ? 'approved' : 'already_processed',
      orderId: alreadyUsed.id,
      providerOrderId: normalized.id,
      reason: null,
      alreadyProcessed: true,
    };
  }

  const productIds = [...new Set(normalized.items.map((item) => item.productId).filter(Boolean))];
  const product = productIds.length === 1 ? shopierProductById(productIds[0]) : null;
  if (!product) {
    return {
      outcome: 'review_required', providerOrderId: normalized.id,
      reason: productIds.length === 1 ? 'product_not_configured' : 'line_item_count_mismatch',
    };
  }

  const candidates = await findCandidateOrders(db, normalized, product);
  if (candidates.length !== 1) {
    const potential = candidates.length ? candidates : await potentialProductOrders(db, normalized, product);
    if (potential.length) {
      await markOrdersForReview(
        db, potential, normalized.id, normalized.paymentStatus,
        candidates.length > 1 ? 'multiple_internal_orders' : (normalized.emailReason || 'customer_email_mismatch'),
      );
    }
    return {
      outcome: 'review_required', providerOrderId: normalized.id,
      reason: candidates.length > 1 ? 'multiple_internal_orders' : (normalized.emailReason || 'no_matching_internal_order'),
    };
  }

  const internalOrder = candidates[0];
  const validation = validateShopierOrder(authoritative, {
    productId: internalOrder.expected_provider_product_id,
    amount: internalOrder.amount,
    customerEmail: internalOrder.customer_email_snapshot,
  });
  if (!validation.ok) {
    await markOrdersForReview(
      db,
      [internalOrder],
      normalized.id,
      normalized.paymentStatus,
      validation.reason,
      { attachProviderOrder: true },
    );
    return {
      outcome: 'review_required', orderId: internalOrder.id,
      providerOrderId: normalized.id, reason: validation.reason,
    };
  }

  const providerPayload = {
    provider: 'shopier',
    providerOrderId: normalized.id,
    productId: internalOrder.expected_provider_product_id,
    paymentStatus: normalized.paymentStatus,
    amount: (validation.order.totalMinor / 100).toFixed(2),
    currency: normalized.currency,
    quantity: validation.order.items[0].quantity,
    customerEmail: normalized.email,
    dateCreated: normalized.dateCreated,
  };
  const { data, error } = await db.rpc('provider_confirm_billing_order', {
    p_order_id: internalOrder.id,
    p_payment_reference: `shopier:${normalized.id}`,
    p_provider_payload: providerPayload,
  });
  if (error) {
    if (isSafeReviewDatabaseError(error)) {
      return {
        outcome: 'review_required', orderId: internalOrder.id,
        providerOrderId: normalized.id, reason: 'provider_confirmation_conflict',
      };
    }
    throw error;
  }
  return {
    outcome: 'approved', orderId: internalOrder.id,
    providerOrderId: normalized.id, reason: null,
    alreadyProcessed: Boolean(data?.alreadyProcessed), subscription: data,
  };
}

export async function reconcileShopierOrder(internalOrderId, { client, admin } = {}) {
  const shopier = client || configuredShopierClient();
  const db = admin || createAdminClient();
  const { data: internalOrder, error } = await db
    .from('billing_orders')
    .select(ORDER_FIELDS)
    .eq('id', internalOrderId)
    .eq('payment_provider', 'shopier')
    .maybeSingle();
  if (error) throw error;
  if (!internalOrder) return { outcome: 'not_found', reason: 'internal_order_not_found' };
  if (internalOrder.status === 'approved') return { outcome: 'approved', orderId: internalOrder.id, alreadyProcessed: true };

  const dateStart = new Date(internalOrder.created_at);
  const result = await shopier.listOrders({
    customerEmail: internalOrder.customer_email_snapshot,
    productId: internalOrder.expected_provider_product_id,
    dateStart: Number.isFinite(dateStart.getTime()) ? dateStart.toISOString() : undefined,
    dateEnd: new Date().toISOString(),
    sort: 'dateDesc',
    limit: 50,
  });
  const orders = Array.isArray(result) ? result : [];
  for (const order of orders) {
    const normalized = normalizeShopierOrder(order);
    if (!normalized.id) continue;
    const outcome = await verifyAndApplyShopierOrder(normalized.id, { client: shopier, admin: db });
    if (outcome.orderId === internalOrder.id
        && ['approved', 'review_required'].includes(outcome.outcome)) return outcome;
  }
  return { outcome: 'pending', orderId: internalOrder.id, reason: 'no_verified_payment_found' };
}

export async function verifyAndApplyShopierRefund(providerRefundId, { client, admin } = {}) {
  const shopier = client || configuredShopierClient();
  const db = admin || createAdminClient();
  let authoritative;
  try {
    authoritative = await shopier.getRefund(providerRefundId);
  } catch (error) {
    if (isPermanentProviderError(error)) {
      return { outcome: 'review_required', providerOrderId: null, reason: 'provider_refund_unavailable' };
    }
    throw error;
  }
  const providerOrderId = String(authoritative?.orderId || '').trim();
  const { data: internalOrder, error } = await db
    .from('billing_orders')
    .select(ORDER_FIELDS)
    .eq('payment_provider', 'shopier')
    .eq('provider_order_id', providerOrderId)
    .maybeSingle();
  if (error) throw error;
  if (!internalOrder) {
    return { outcome: 'review_required', providerOrderId, reason: 'refund_order_not_found' };
  }

  const validation = validateShopierRefund(authoritative, { amount: internalOrder.amount });
  if (!validation.ok) {
    await markOrdersForReview(
      db,
      [internalOrder],
      providerOrderId,
      `refund_${validation.refund.status || 'unknown'}`,
      validation.reason,
      { attachProviderOrder: true },
    );
    return {
      outcome: 'review_required', orderId: internalOrder.id,
      providerOrderId, reason: validation.reason,
    };
  }

  const refund = validation.refund;
  const { data, error: reconcileError } = await db.rpc('reconcile_shopier_refund', {
    p_order_id: internalOrder.id,
    p_refund_id: refund.id,
    p_refund_type: refund.type,
    p_refund_status: refund.status,
    p_refund_total: (refund.totalMinor / 100).toFixed(2),
    p_currency: refund.currency,
  });
  if (reconcileError) {
    if (isSafeReviewDatabaseError(reconcileError)) {
      return {
        outcome: 'review_required', orderId: internalOrder.id,
        providerOrderId, reason: 'refund_reconciliation_conflict',
      };
    }
    throw reconcileError;
  }
  return {
    outcome: data?.requiresReview ? 'review_required' : 'processed',
    orderId: internalOrder.id, providerOrderId, reason: data?.requiresReview ? 'refund_entitlement_review' : null,
    refund: data,
  };
}

export async function processShopierEvent({ eventType, providerResourceId }, options = {}) {
  if (eventType === 'order.created') {
    return verifyAndApplyShopierOrder(providerResourceId, options);
  }
  if (eventType === 'refund.updated') {
    return verifyAndApplyShopierRefund(providerResourceId, options);
  }
  return { outcome: 'review_required', reason: 'unsupported_event' };
}
