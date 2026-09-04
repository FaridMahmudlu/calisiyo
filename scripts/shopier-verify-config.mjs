import {
  createShopierClient,
  isSafeShopierProductUrl,
  isShopierProductActive,
  moneyToMinorUnits,
} from '../lib/billing/shopier-core.mjs';
import { producerDiscountMinor } from '../lib/billing/content-producer.mjs';
import { planPriceMinor } from '../lib/billing/pricing-catalog.mjs';

const money = (minor) => (minor / 100).toFixed(2);
const expected = ['2027', '2028'].flatMap((year) => {
  const planCode = `plus_${year}`;
  const listMinor = planPriceMinor(planCode);
  return [
    { planCode, amount: money(listMinor), currency: 'TRY', id: process.env[`SHOPIER_PRODUCT_ID_${year}`], url: process.env[`SHOPIER_PRODUCT_URL_${year}`] },
    { planCode: `${planCode}_creator`, amount: money(listMinor - producerDiscountMinor(listMinor)), currency: 'TRY', creator: true, id: process.env[`SHOPIER_CREATOR_PRODUCT_ID_${year}`], url: process.env[`SHOPIER_CREATOR_PRODUCT_URL_${year}`] },
  ];
});

function fail(message) {
  console.error(`HATA: ${message}`);
  process.exitCode = 1;
}

const token = String(process.env.SHOPIER_ACCESS_TOKEN || '').trim();
if (!token) {
  fail('SHOPIER_ACCESS_TOKEN tanımlı değil.');
} else {
  try {
    const client = createShopierClient({ accessToken: token });
    const [response, discountCodeResponse, automaticResponse] = await Promise.all([
      client.listProducts({ limit: 50, sort: 'dateDesc' }),
      client.listDiscountCodes({ limit: 50, sort: 'dateDesc' }),
      client.listAutomaticDiscounts({ limit: 50, sort: 'dateDesc' }),
    ]);
    const products = Array.isArray(response) ? response : [];
    if (!Array.isArray(discountCodeResponse)) fail('Shopier indirim kodu API yanıtı doğrulanamadı.');
    const configuredIdValues = expected.map((item) => String(item.id || '').trim()).filter(Boolean);
    const configuredProductIds = new Set(configuredIdValues);
    if (configuredProductIds.size !== configuredIdValues.length) {
      fail('Standart ve içerik üretici Shopier ürün kimlikleri benzersiz değil.');
    }
    const unexpectedProducts = products.filter((product) => !configuredProductIds.has(String(product?.id || '')));
    console.log(JSON.stringify({
      check: 'store-product-scope',
      storeProductCount: products.length,
      configuredProductCount: configuredProductIds.size,
      unexpectedProductCount: unexpectedProducts.length,
    }));
    for (const item of expected) {
      const id = String(item.id || '').trim();
      if (!id) { fail(`${item.planCode} ürün kimliği tanımlı değil.`); continue; }
      if (!isSafeShopierProductUrl(String(item.url || '').trim())) { fail(`${item.planCode} checkout URL güvenli değil.`); continue; }
      const product = products.find((candidate) => String(candidate?.id || '') === id);
      if (!product) { fail(`${item.planCode} ürün kimliği Shopier hesabında bulunamadı.`); continue; }
      const priceData = product.priceData && typeof product.priceData === 'object' ? product.priceData : {};
      const actualCurrency = String(priceData.currency || '').toUpperCase();
      const actualPrice = moneyToMinorUnits(priceData.price);
      const expectedPrice = moneyToMinorUnits(item.amount);
      const shipping = moneyToMinorUnits(priceData.shippingPrice);
      const active = String(product.stockStatus || product.status || '').toLowerCase();
      console.log(JSON.stringify({
        planCode: item.planCode,
        productId: id,
        name: String(product.name || '').slice(0, 120),
        price: priceData.price,
        currency: actualCurrency,
        status: active || null,
        shippingPrice: priceData.shippingPrice ?? null,
        publicUrl: item.url,
      }));
      if (actualCurrency !== item.currency) fail(`${item.planCode} para birimi ${item.currency} değil.`);
      if (actualPrice !== expectedPrice) fail(`${item.planCode} fiyatı beklenen tutarla eşleşmiyor.`);
      if (shipping !== 0) fail(`${item.planCode} ürününde kargo tutarı sıfır değil.`);
      if (priceData.discount === true) fail(`${item.planCode} ürününde beklenmeyen indirim etkin.`);
      if (!isShopierProductActive(product)) fail(`${item.planCode} ürünü Shopier'de aktif satışta değil.`);
    }
    const creatorProductIds = new Set(expected.filter((item) => item.creator).map((item) => String(item.id || '').trim()).filter(Boolean));
    for (const discount of Array.isArray(discountCodeResponse) ? discountCodeResponse : []) {
      const scope = String(discount?.scope || '');
      const includesCreatorProduct = (discount?.productIds || [])
        .some((productId) => creatorProductIds.has(String(productId)));
      if (scope === 'all' || scope === 'selectedCategories' || includesCreatorProduct) {
        fail('İçerik üretici ürünü ek bir Shopier indirim kodunun kapsamında. İndirim istifleme riski var.');
      }
    }
    const productIds = configuredProductIds;
    const now = Date.now();
    const conflictingAutomaticDiscounts = (Array.isArray(automaticResponse) ? automaticResponse : []).filter((discount) => {
      const startsAt = discount?.startsAt ? Date.parse(discount.startsAt) : Number.NEGATIVE_INFINITY;
      const expiresAt = discount?.expiresAt ? Date.parse(discount.expiresAt) : Number.POSITIVE_INFINITY;
      if (Number.isNaN(startsAt) || Number.isNaN(expiresAt)) return true;
      if (now < startsAt || now >= expiresAt) return false;
      if (discount?.scope === 'all' || discount?.scope === 'selectedCategories') return true;
      return discount?.scope === 'selectedProducts'
        && (discount.productIds || []).some((productId) => productIds.has(String(productId)));
    });
    if (conflictingAutomaticDiscounts.length) {
      fail(`Calisiyo ürünlerini etkileyebilecek ${conflictingAutomaticDiscounts.length} aktif otomatik indirim bulundu.`);
    }
    const promoScopeVerified = String(process.env.SHOPIER_PROMO_SCOPE_VERIFIED || '').toLowerCase() === 'true';
    if (promoScopeVerified && unexpectedProducts.length) {
      fail('Mağazada iki Calisiyo ürünü dışında ürün bulunduğu için mağaza-geneli üretici kodu güvenli değil.');
    }
    if (!promoScopeVerified) {
      fail('Shopier indirim kodlarının yalnızca iki Calisiyo ürününe uygulanacağı manuel olarak doğrulanmadı.');
    }
    if (String(process.env.SHOPIER_CREATOR_PRODUCTS_VALIDATED || '').toLowerCase() !== 'true') {
      fail('İçerik üretici ürün doğrulama bayrağı etkin değil.');
    }
    if (!process.exitCode) console.log('Standart ve içerik üretici Shopier ürün yapılandırması doğrulandı.');
  } catch (error) {
    fail(`Shopier doğrulaması tamamlanamadı (${error?.code || 'unknown'}).`);
  }
}
