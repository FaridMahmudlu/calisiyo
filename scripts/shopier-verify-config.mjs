import {
  createShopierClient,
  isSafeShopierProductUrl,
  moneyToMinorUnits,
} from '../lib/billing/shopier-core.mjs';

const expected = [
  {
    planCode: 'plus_2027', amount: '2000', currency: 'TRY',
    id: process.env.SHOPIER_PRODUCT_ID_2027,
    url: process.env.SHOPIER_PRODUCT_URL_2027,
  },
  {
    planCode: 'plus_2028', amount: '1000', currency: 'TRY',
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
    const response = await client.listProducts({ limit: 50, sort: 'dateDesc' });
    const products = Array.isArray(response) ? response : [];
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
    if (!process.exitCode) console.log('Shopier ürün yapılandırması doğrulandı. SHOPIER_PRODUCTS_VALIDATED=true yapılabilir.');
  } catch (error) {
    fail(`Shopier doğrulaması tamamlanamadı (${error?.code || 'unknown'}).`);
  }
}
