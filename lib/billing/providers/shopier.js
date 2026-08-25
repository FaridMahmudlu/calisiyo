import 'server-only';
import {
  createShopierClient,
  isSafeShopierProductUrl,
  verifyShopierWebhookSignature,
} from '../shopier-core.mjs';
import { getPlanPrice } from '../plans';

function value(name) {
  return String(process.env[name] || '').trim();
}

export function getShopierConfiguration() {
  const products = {
    plus_2027: {
      planCode: 'plus_2027',
      productId: value('SHOPIER_PRODUCT_ID_2027'),
      checkoutUrl: value('SHOPIER_PRODUCT_URL_2027'),
      amount: getPlanPrice('plus_2027'),
      currency: 'TRY',
    },
    plus_2028: {
      planCode: 'plus_2028',
      productId: value('SHOPIER_PRODUCT_ID_2028'),
      checkoutUrl: value('SHOPIER_PRODUCT_URL_2028'),
      amount: getPlanPrice('plus_2028'),
      currency: 'TRY',
    },
  };
  const secrets = [value('SHOPIER_WEBHOOK_SECRET'), ...value('SHOPIER_WEBHOOK_SECRETS').split(',')]
    .map((item) => item.trim())
    .filter((item, index, all) => item && all.indexOf(item) === index);
  return {
    accessToken: value('SHOPIER_ACCESS_TOKEN'),
    products,
    secrets,
    productsValidated: value('SHOPIER_PRODUCTS_VALIDATED').toLowerCase() === 'true',
    promoScopeVerified: value('SHOPIER_PROMO_SCOPE_VERIFIED').toLowerCase() === 'true',
  };
}

export function shopierConfigurationProblems() {
  const config = getShopierConfiguration();
  const missing = [];
  if (!config.accessToken) missing.push('Shopier erişim anahtarı');
  for (const product of Object.values(config.products)) {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(product.productId)) missing.push(`${product.planCode} Shopier ürün kimliği`);
    if (!isSafeShopierProductUrl(product.checkoutUrl)) missing.push(`${product.planCode} Shopier ürün bağlantısı`);
  }
  if (config.products.plus_2027.productId
      && config.products.plus_2027.productId === config.products.plus_2028.productId) {
    missing.push('benzersiz Shopier ürün kimlikleri');
  }
  if (!config.secrets.some((secret) => secret.length >= 16)) missing.push('Shopier webhook anahtarı');
  if (!config.productsValidated) missing.push('doğrulanmış Shopier ürün yapılandırması');
  if (!config.promoScopeVerified) missing.push('Shopier indirim kodu ürün kapsamı doğrulaması');
  return missing;
}

export function configuredShopierClient(options = {}) {
  const config = getShopierConfiguration();
  return createShopierClient({ accessToken: config.accessToken, ...options });
}

export function shopierProductForPlan(planCode) {
  return getShopierConfiguration().products[planCode] || null;
}

export function shopierProductById(productId) {
  const expected = String(productId || '').trim();
  return Object.values(getShopierConfiguration().products)
    .find((product) => product.productId === expected) || null;
}

export function verifyConfiguredShopierWebhook(rawBody, signature) {
  return verifyShopierWebhookSignature({
    rawBody,
    signature,
    secrets: getShopierConfiguration().secrets,
  });
}
