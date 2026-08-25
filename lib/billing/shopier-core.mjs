import { createHmac, timingSafeEqual } from 'node:crypto';

export const SHOPIER_API_BASE_URL = 'https://api.shopier.com/v1/';
export const SHOPIER_WEBHOOK_EVENTS = Object.freeze(['order.created', 'refund.updated']);

const PROVIDER_ID = /^[A-Za-z0-9_-]{1,160}$/;

export class ShopierApiError extends Error {
  constructor(message, { code = 'SHOPIER_API_ERROR', status = 0, retryAfter = null } = {}) {
    super(message);
    this.name = 'ShopierApiError';
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

function requireProviderId(value, label = 'Shopier kimliği') {
  const result = String(value || '').trim();
  if (!PROVIDER_ID.test(result)) {
    throw new ShopierApiError(`${label} geçersiz.`, { code: 'SHOPIER_INVALID_ID' });
  }
  return result;
}

function safeErrorMessage(payload, fallback) {
  const candidate = payload?.message || payload?.error?.message || payload?.error || payload?.detail;
  return typeof candidate === 'string' && candidate.trim()
    ? candidate.trim().slice(0, 240)
    : fallback;
}

export function createShopierClient({ accessToken, fetchImpl = globalThis.fetch, timeoutMs = 3200 } = {}) {
  const token = String(accessToken || '').trim();
  if (!token) throw new ShopierApiError('Shopier yapılandırması tamamlanmamış.', { code: 'SHOPIER_NOT_CONFIGURED' });
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');

  async function request(pathname, { method = 'GET', query, body } = {}) {
    if (!/^\/[a-z0-9/_-]*$/i.test(pathname) || pathname.includes('..')) {
      throw new ShopierApiError('Shopier API yolu geçersiz.', { code: 'SHOPIER_INVALID_PATH' });
    }
    const url = new URL(pathname.replace(/^\//, ''), SHOPIER_API_BASE_URL);
    for (const [key, value] of Object.entries(query || {})) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    }

    let response;
    try {
      response = await fetchImpl(url, {
        method,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';
      throw new ShopierApiError(
        timedOut ? 'Shopier isteği zaman aşımına uğradı.' : 'Shopier bağlantısı kurulamadı.',
        { code: timedOut ? 'SHOPIER_TIMEOUT' : 'SHOPIER_NETWORK_ERROR' },
      );
    }

    const responseText = await response.text();
    let payload = null;
    if (responseText) {
      try {
        payload = JSON.parse(responseText);
      } catch {
        if (response.ok) {
          throw new ShopierApiError('Shopier geçersiz bir yanıt döndürdü.', {
            code: 'SHOPIER_INVALID_JSON', status: response.status,
          });
        }
      }
    }
    if (!response.ok) {
      throw new ShopierApiError(
        safeErrorMessage(payload, 'Shopier isteği tamamlanamadı.'),
        {
          code: `SHOPIER_HTTP_${response.status}`,
          status: response.status,
          retryAfter: response.headers.get('retry-after'),
        },
      );
    }
    return payload;
  }

  return Object.freeze({
    listProducts: (query = {}) => request('/products', { query }),
    getProduct: (productId) => request(`/products/${encodeURIComponent(requireProviderId(productId, 'Ürün kimliği'))}`),
    updateProduct: (productId, body) => request(`/products/${encodeURIComponent(requireProviderId(productId, 'Ürün kimliği'))}`, { method: 'PUT', body }),
    listDiscountCodes: (query = {}) => request('/discounts/codes', { query }),
    getDiscountCode: (discountId) => request(`/discounts/codes/${encodeURIComponent(requireProviderId(discountId, 'İndirim kimliği'))}`),
    createDiscountCode: (body) => request('/discounts/codes', { method: 'POST', body }),
    updateDiscountCode: (discountId, body) => request(`/discounts/codes/${encodeURIComponent(requireProviderId(discountId, 'İndirim kimliği'))}`, { method: 'PUT', body }),
    deleteDiscountCode: (discountId) => request(`/discounts/codes/${encodeURIComponent(requireProviderId(discountId, 'İndirim kimliği'))}`, { method: 'DELETE' }),
    listAutomaticDiscounts: (query = {}) => request('/discounts/automatic', { query }),
    listOrders: (query = {}) => request('/orders', { query }),
    getOrder: (orderId) => request(`/orders/${encodeURIComponent(requireProviderId(orderId, 'Sipariş kimliği'))}`),
    listRefunds: (query = {}) => request('/refunds', { query }),
    getRefund: (refundId) => request(`/refunds/${encodeURIComponent(requireProviderId(refundId, 'İade kimliği'))}`),
    listWebhooks: (query = {}) => request('/webhooks', { query }),
    createWebhook: ({ event, url }) => request('/webhooks', { method: 'POST', body: { event, url } }),
  });
}

function constantTimeTextEqual(expected, received) {
  const left = Buffer.from(expected, 'utf8');
  const right = Buffer.from(received, 'utf8');
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyShopierWebhookSignature({ rawBody, signature, secrets }) {
  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody || '');
  const received = String(signature || '').trim();
  if (!received || received.length > 256) return false;

  return (Array.isArray(secrets) ? secrets : [secrets])
    .map((secret) => String(secret || '').trim())
    .filter(Boolean)
    .some((secret) => {
      const digest = createHmac('sha256', secret).update(body).digest();
      return constantTimeTextEqual(digest.toString('hex'), received)
        || constantTimeTextEqual(digest.toString('base64'), received);
    });
}

export function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return email.length >= 3
    && email.length <= 320
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : null;
}

export function moneyToMinorUnits(value) {
  const text = String(value ?? '').trim();
  if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, decimal = ''] = text.split('.');
  const cents = Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
}

export function isSafeShopierProductUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:'
      && url.hostname === 'www.shopier.com'
      && /^\/\d+\/?$/.test(url.pathname)
      && !url.search
      && !url.hash;
  } catch {
    return false;
  }
}
