import 'server-only';
import {
  createShopierClient,
  isSafeShopierProductUrl,
  verifyShopierWebhookSignature,
} from '../shopier-core.mjs';
import { producerDiscountMinor } from '../content-producer.mjs';
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
      pricingSource: 'standard',
    },
    plus_2028: {
      planCode: 'plus_2028',
      productId: value('SHOPIER_PRODUCT_ID_2028'),
      checkoutUrl: value('SHOPIER_PRODUCT_URL_2028'),
      amount: getPlanPrice('plus_2028'),
      currency: 'TRY',
      pricingSource: 'standard',
    },
  };
  const creatorProducts = Object.fromEntries(Object.entries(products).map(([planCode, product]) => {
    const year = planCode === 'plus_2027' ? '2027' : '2028';
    const listMinor = Math.round(product.amount * 100);
    return [planCode, {
      ...product,
      productId: value(`SHOPIER_CREATOR_PRODUCT_ID_${year}`),
      checkoutUrl: value(`SHOPIER_CREATOR_PRODUCT_URL_${year}`),
      amount: (listMinor - producerDiscountMinor(listMinor)) / 100,
      pricingSource: 'signup_creator_code',
    }];
  }));
  const secrets = [value('SHOPIER_WEBHOOK_SECRET'), ...value('SHOPIER_WEBHOOK_SECRETS').split(',')]
    .map((item) => item.trim())
    .filter((item, index, all) => item && all.indexOf(item) === index);
  return {
    accessToken: value('SHOPIER_ACCESS_TOKEN'),
    products,
    creatorProducts,
    secrets,
    productsValidated: value('SHOPIER_PRODUCTS_VALIDATED').toLowerCase() === 'true',
    creatorProductsValidated: value('SHOPIER_CREATOR_PRODUCTS_VALIDATED').toLowerCase() === 'true',
    promoScopeVerified: value('SHOPIER_PROMO_SCOPE_VERIFIED').toLowerCase() === 'true',
  };
}

export function creatorShopierConfigurationProblems() {
  const config = getShopierConfiguration();
  const missing = [];
  for (const product of Object.values(config.creatorProducts)) {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(product.productId)) missing.push(`${product.planCode} içerik üretici ürünü kimliği`);
    if (!isSafeShopierProductUrl(product.checkoutUrl)) missing.push(`${product.planCode} içerik üretici ürünü bağlantısı`);
    const listMinor = Math.round(getPlanPrice(product.planCode) * 100);
    if (product.amount !== (listMinor - producerDiscountMinor(listMinor)) / 100) missing.push(`${product.planCode} içerik üretici ürünü fiyatı`);
  }
  const allIds = [
    ...Object.values(config.products),
    ...Object.values(config.creatorProducts),
  ].map((product) => product.productId).filter(Boolean);
  if (new Set(allIds).size !== allIds.length) missing.push('benzersiz standart ve içerik üretici ürün kimlikleri');
  if (!config.creatorProductsValidated) missing.push('doğrulanmış içerik üretici Shopier ürünleri');
  return missing;
}

export function shopierCommonConfigurationProblems() {
  const config = getShopierConfiguration();
  const missing = [];
  if (!config.accessToken) missing.push('Shopier erişim anahtarı');
  if (!config.secrets.some((secret) => secret.length >= 16)) missing.push('Shopier webhook anahtarı');
  return missing;
}

export function shopierStandardProductConfigurationProblems() {
  const config = getShopierConfiguration();
  const missing = [];
  for (const product of Object.values(config.products)) {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(product.productId)) missing.push(`${product.planCode} Shopier ürün kimliği`);
    if (!isSafeShopierProductUrl(product.checkoutUrl)) missing.push(`${product.planCode} Shopier ürün bağlantısı`);
  }
  if (config.products.plus_2027.productId
      && config.products.plus_2027.productId === config.products.plus_2028.productId) {
    missing.push('benzersiz Shopier ürün kimlikleri');
  }
  if (!config.productsValidated) missing.push('doğrulanmış Shopier ürün yapılandırması');
  if (!config.promoScopeVerified) missing.push('Shopier indirim kodu ürün kapsamı doğrulaması');
  return missing;
}

export function shopierConfigurationProblems() {
  return [...shopierCommonConfigurationProblems(), ...shopierStandardProductConfigurationProblems()];
}

export function configuredShopierClient(options = {}) {
  const config = getShopierConfiguration();
  return createShopierClient({ accessToken: config.accessToken, ...options });
}

export function shopierProductForPlan(planCode, pricingSource = 'standard') {
  const config = getShopierConfiguration();
  return (pricingSource === 'signup_creator_code' ? config.creatorProducts : config.products)[planCode] || null;
}

export function shopierProductById(productId) {
  const expected = String(productId || '').trim();
  const config = getShopierConfiguration();
  return [...Object.values(config.products), ...Object.values(config.creatorProducts)]
    .find((product) => product.productId === expected) || null;
}

export function verifyConfiguredShopierWebhook(rawBody, signature) {
  return verifyShopierWebhookSignature({
    rawBody,
    signature,
    secrets: getShopierConfiguration().secrets,
  });
}
