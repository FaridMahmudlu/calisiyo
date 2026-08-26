const { test, expect } = require('@playwright/test');
const { createHmac } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');

async function modules() {
  const core = await import(pathToFileURL(path.join(root, 'lib', 'billing', 'shopier-core.mjs')).href);
  const verification = await import(pathToFileURL(path.join(root, 'lib', 'billing', 'shopier-verification.mjs')).href);
  const producer = await import(pathToFileURL(path.join(root, 'lib', 'billing', 'content-producer.mjs')).href);
  return { ...core, ...verification, ...producer };
}

function providerOrder(overrides = {}) {
  return {
    id: 'ord_123', paymentStatus: 'paid', status: 'open', currency: 'TRY',
    dateCreated: '2026-08-20T12:00:00Z',
    totals: { subtotal: '2500.00', shipping: '0.00', discount: '0.00', total: '2500.00' },
    lineItems: [{ productId: 'prod_2027', quantity: 1, price: '2500.00', total: '2500.00' }],
    billingInfo: { email: 'Emir.Kaya@example.com' },
    shippingInfo: { email: 'emir.kaya@example.com' },
    ...overrides,
  };
}

test.describe('Shopier server-side billing contracts', () => {
  test('client uses the fixed official origin and keeps PAT only in Authorization', async () => {
    const { createShopierClient, SHOPIER_API_BASE_URL } = await modules();
    let captured;
    const client = createShopierClient({
      accessToken: 'private-pat',
      fetchImpl: async (url, options) => {
        captured = { url: String(url), options };
        return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
      },
    });
    await client.listOrders({ customerEmail: 'student@example.com' });
    expect(SHOPIER_API_BASE_URL).toBe('https://api.shopier.com/v1/');
    expect(captured.url).toMatch(/^https:\/\/api\.shopier\.com\/v1\/orders\?/);
    expect(captured.url).not.toContain('private-pat');
    expect(captured.options.headers.Authorization).toBe('Bearer private-pat');
  });

  test('client normalizes non-JSON provider errors and enforces timeout', async () => {
    const { createShopierClient } = await modules();
    const broken = createShopierClient({
      accessToken: 'pat',
      fetchImpl: async () => new Response('<html>no</html>', { status: 502 }),
    });
    await expect(broken.listProducts()).rejects.toMatchObject({ code: 'SHOPIER_HTTP_502', status: 502 });

    const slow = createShopierClient({
      accessToken: 'pat', timeoutMs: 5,
      fetchImpl: async (_url, options) => new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(options.signal.reason));
      }),
    });
    await expect(slow.listProducts()).rejects.toMatchObject({ code: 'SHOPIER_TIMEOUT' });
  });

  test('client uses official discount-code endpoints without exposing the PAT', async () => {
    const { createShopierClient } = await modules();
    const requests = [];
    const client = createShopierClient({
      accessToken: 'private-pat',
      fetchImpl: async (url, options) => {
        requests.push({ url: String(url), options });
        return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
      },
    });
    await client.listDiscountCodes({ limit: 10 });
    await client.getDiscountCode('discount_1');
    await client.createDiscountCode({ code: 'EMIRKAYA', type: 'percent', percentOff: 20 });
    await client.updateDiscountCode('discount_1', { isActive: false });
    await client.deleteDiscountCode('discount_1');
    await client.listAutomaticDiscounts({ limit: 10 });
    expect(requests.map((item) => [new URL(item.url).pathname, item.options.method])).toEqual([
      ['/v1/discounts/codes', 'GET'],
      ['/v1/discounts/codes/discount_1', 'GET'],
      ['/v1/discounts/codes', 'POST'],
      ['/v1/discounts/codes/discount_1', 'PUT'],
      ['/v1/discounts/codes/discount_1', 'DELETE'],
      ['/v1/discounts/automatic', 'GET'],
    ]);
    expect(requests.every((item) => !item.url.includes('private-pat'))).toBe(true);
  });

  test('webhook HMAC accepts valid hex/base64 and rejects missing, malformed, or modified bodies', async () => {
    const { verifyShopierWebhookSignature } = await modules();
    const rawBody = Buffer.from('{"id":"ord_123"}');
    const secret = 'shopier-webhook-token';
    const digest = createHmac('sha256', secret).update(rawBody).digest();
    const verify = (body, signature) => verifyShopierWebhookSignature({ rawBody: body, signature, secrets: [secret] });
    expect(verify(rawBody, digest.toString('hex'))).toBe(true);
    expect(verify(rawBody, digest.toString('base64'))).toBe(true);
    expect(verify(rawBody, '')).toBe(false);
    expect(verify(rawBody, 'not-a-signature')).toBe(false);
    expect(verify(Buffer.from('{"id":"ord_124"}'), digest.toString('hex'))).toBe(false);
  });

  test('authoritative order validation is exact and fail-closed', async () => {
    const { validateShopierOrder } = await modules();
    const expected = { productId: 'prod_2027', amount: '2500.00', customerEmail: 'emir.kaya@example.com' };
    expect(validateShopierOrder(providerOrder(), expected)).toMatchObject({ ok: true, reason: null });
    expect(validateShopierOrder(providerOrder({ paymentStatus: 'unpaid' }), expected).reason).toBe('payment_not_paid');
    expect(validateShopierOrder(providerOrder({ currency: 'USD' }), expected).reason).toBe('currency_mismatch');
    expect(validateShopierOrder(providerOrder({ totals: { subtotal: '2499.00', shipping: '0.00', discount: '0.00', total: '2499.00' } }), expected).reason).toBe('amount_mismatch');
    expect(validateShopierOrder(providerOrder({ lineItems: [{ productId: 'other', quantity: 1, price: '2500.00', total: '2500.00' }] }), expected).reason).toBe('product_mismatch');
    expect(validateShopierOrder(providerOrder({ lineItems: [{ productId: 'prod_2027', quantity: 2, price: '1250.00', total: '2500.00' }] }), expected).reason).toBe('quantity_mismatch');
    expect(validateShopierOrder(providerOrder({ billingInfo: { email: 'other@example.com' }, shippingInfo: { email: 'other@example.com' } }), expected).reason).toBe('customer_email_mismatch');
    expect(validateShopierOrder(providerOrder({ lineItems: [providerOrder().lineItems[0], providerOrder().lineItems[0]] }), expected).reason).toBe('line_item_count_mismatch');
  });

  test('recognized 20% producer discount passes and unknown or malformed discounts fail closed', async () => {
    const { validateShopierOrder } = await modules();
    const discounted = providerOrder({
      totals: { subtotal: '2500.00', shipping: '0.00', discount: '500.00', total: '2000.00' },
      discounts: [{ id: 'discount_1', method: 'discountCode' }],
    });
    const expected = {
      productId: 'prod_2027', listAmount: '2500.00', amount: '2000.00',
      providerDiscountId: 'discount_1', customerEmail: 'emir.kaya@example.com',
    };
    expect(validateShopierOrder(discounted, expected)).toMatchObject({ ok: true, reason: null });
    expect(validateShopierOrder(discounted, { ...expected, providerDiscountId: 'unknown' }).reason).toBe('discount_binding_mismatch');
    expect(validateShopierOrder({ ...discounted, discounts: [{ id: 'discount_1', method: 'automaticDiscount' }] }, expected).reason).toBe('discount_method_mismatch');
    expect(validateShopierOrder({ ...discounted, discounts: [{ id: 'discount_1', method: 'discountCode' }, { id: 'discount_2', method: 'discountCode' }] }, expected).reason).toBe('discount_count_mismatch');
    expect(validateShopierOrder(providerOrder({ totals: { subtotal: '2500.00', shipping: '0.00', discount: '250.00', total: '2250.00' }, discounts: [{ id: 'discount_1', method: 'discountCode' }] }), expected).reason).toBe('amount_mismatch');
  });

  test('producer business rules keep promo payload, 20% arithmetic and reward tiers exact', async () => {
    const {
      isExactProducerDiscount, producerRewardMinor,
      shopierProducerDiscountPayload, validShopierProducerDiscount,
    } = await modules();
    const payload = shopierProducerDiscountPayload('emir2027');
    expect(payload).toEqual({
      code: 'EMIR2027', type: 'percent', percentOff: '20', amountMinimum: '0.00',
      currency: 'TRY', numAvailable: 1000000, expiresAt: '2028-06-25+0300',
    });
    expect(validShopierProducerDiscount({ ...payload, id: 'discount_1' }, 'EMIR2027')).toBe(true);
    expect(isExactProducerDiscount({ listMinor: 250000, paidMinor: 200000, discountMinor: 50000 })).toBe(true);
    expect(isExactProducerDiscount({ listMinor: 450000, paidMinor: 360000, discountMinor: 90000 })).toBe(true);
    expect(isExactProducerDiscount({ listMinor: 450000, paidMinor: 359999, discountMinor: 90001 })).toBe(false);
    expect([1, 2, 3, 4, 5].map(producerRewardMinor)).toEqual([100000, 100000, 100000, 50000, 50000]);
    expect(producerRewardMinor(0)).toBeNull();
    expect(() => shopierProducerDiscountPayload('x')).toThrow('invalid_producer_code');
  });

  test('both products and refund states preserve exact money semantics', async () => {
    const { validateShopierOrder, validateShopierRefund } = await modules();
    const order2028 = providerOrder({
      id: 'ord_2028',
      totals: { subtotal: '4500.00', shipping: '0.00', discount: '0.00', total: '4500.00' },
      lineItems: [{ productId: 'prod_2028', quantity: 1, price: '4500.00', total: '4500.00' }],
    });
    expect(validateShopierOrder(order2028, {
      productId: 'prod_2028', amount: 4500, customerEmail: 'emir.kaya@example.com',
    }).ok).toBe(true);
    const fullRefund = { id: 'ref_1', orderId: 'ord_123', type: 'full', status: 'succeeded', currency: 'TRY', total: '2500.00' };
    expect(validateShopierRefund(fullRefund, { amount: 2500 }).ok).toBe(true);
    expect(validateShopierRefund({ ...fullRefund, status: 'failed' }, { amount: 2500 }).ok).toBe(true);
    expect(validateShopierRefund({ ...fullRefund, total: '2499.00' }, { amount: 2500 }).reason).toBe('refund_total_mismatch');
    expect(validateShopierRefund({ ...fullRefund, type: 'partial', total: '2500.01' }, { amount: 2500 }).reason).toBe('refund_amount_exceeds_order');
    expect(validateShopierRefund({ ...fullRefund, type: 'partial', total: '0.00' }, { amount: 2500 }).reason).toBe('refund_amount_invalid');
  });

  test('active routes contain no client-side secret or iyzico dependency', () => {
    const files = [
      'app/api/billing/orders/route.js',
      'app/api/billing/verify/route.js',
      'app/api/billing/shopier/webhook/route.js',
      'app/dashboard/abonelik/page.js',
    ].map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
    expect(files).not.toMatch(/NEXT_PUBLIC_SHOPIER|SHOPIER_ACCESS_TOKEN|SUPABASE_SERVICE_ROLE_KEY/);
    expect(files).not.toMatch(/billing\/iyzico|iyzico_link_token|iyzico_link_url/i);
    expect(files).toContain("request.headers.get('shopier-signature')");
    expect(files.indexOf('verifyConfiguredShopierWebhook')).toBeLessThan(files.indexOf('JSON.parse(rawBody'));
  });

  test('webhook setup never prints tokens or overwrites an existing secret file', () => {
    const script = fs.readFileSync(path.join(root, 'scripts', 'shopier-webhooks.mjs'), 'utf8');
    expect(script).toContain("flag: 'wx'");
    expect(script).toContain("error?.code === 'EEXIST'");
    expect(script).not.toMatch(/console\.(?:log|error)\([^\n]*(?:webhookToken|createdSecrets)/);
  });
});
