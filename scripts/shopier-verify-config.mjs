import {
  createShopierClient,
  isSafeShopierProductUrl,
  moneyToMinorUnits,
} from '../lib/billing/shopier-core.mjs';

const expected = [
  {
    planCode: 'plus_2027', amount: '2500', currency: 'TRY',
    id: process.env.SHOPIER_PRODUCT_ID_2027,
    url: process.env.SHOPIER_PRODUCT_URL_2027,
  },
  {
    planCode: 'plus_2028', amount: '1500', currency: 'TRY',
    id: process.env.SHOPIER_PRODUCT_ID_2028,
    url: process.env.SHOPIER_PRODUCT_URL_2028,
  },
];

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
      client.listDiscountCodes({ limit: 1, sort: 'dateDesc' }),
      client.listAutomaticDiscounts({ limit: 50, sort: 'dateDesc' }),
    ]);
    const products = Array.isArray(response) ? response : [];
    if (!Array.isArray(discountCodeResponse)) fail('Shopier indirim kodu API yanıtı doğrulanamadı.');
    const configuredProductIds = new Set(expected.map((item) => String(item.id || '').trim()).filter(Boolean));
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
      if (!isSafeShopierProductUrl(item.url)) { fail(`${item.planCode} checkout URL güvenli değil.`); continue; }
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
    if (!process.exitCode) console.log('Shopier ürün yapılandırması doğrulandı. SHOPIER_PRODUCTS_VALIDATED=true yapılabilir.');
  } catch (error) {
    fail(`Shopier doğrulaması tamamlanamadı (${error?.code || 'unknown'}).`);
  }
}
