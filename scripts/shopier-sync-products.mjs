import {
  createShopierClient,
  isShopierProductActive,
  moneyToMinorUnits,
} from '../lib/billing/shopier-core.mjs';
import { producerDiscountMinor } from '../lib/billing/content-producer.mjs';
import { planPriceMinor } from '../lib/billing/pricing-catalog.mjs';

const apply = process.argv.includes('--apply');
const money = (minor) => (minor / 100).toFixed(2);
const expected = ['2027', '2028'].flatMap((year) => {
  const planCode = `plus_${year}`;
  const listMinor = planPriceMinor(planCode);
  return [
    { planCode, productId: process.env[`SHOPIER_PRODUCT_ID_${year}`], price: money(listMinor) },
    { planCode: `${planCode}_creator`, productId: process.env[`SHOPIER_CREATOR_PRODUCT_ID_${year}`], price: money(listMinor - producerDiscountMinor(listMinor)) },
  ];
});

function fail(message) {
  console.error(`HATA: ${message}`);
  process.exitCode = 1;
}

const token = String(process.env.SHOPIER_ACCESS_TOKEN || '').trim();
if (!token) {
  fail('SHOPIER_ACCESS_TOKEN tanımlı değil.');
} else if (expected.some((item) => !/^[A-Za-z0-9_-]{1,128}$/.test(String(item.productId || '').trim()))) {
  fail('Standart ve içerik üretici Shopier ürün kimliklerinin tamamı tanımlı olmalı.');
} else if (new Set(expected.map((item) => String(item.productId).trim())).size !== expected.length) {
  fail('Standart ve içerik üretici Shopier ürün kimlikleri benzersiz olmalı.');
} else {
  const client = createShopierClient({ accessToken: token, timeoutMs: 10_000 });
  for (const item of expected) {
    try {
      const productId = String(item.productId).trim();
      const before = await client.getProduct(productId);
      const priceData = before?.priceData && typeof before.priceData === 'object' ? before.priceData : {};
      const currentMinor = moneyToMinorUnits(priceData.price);
      const expectedMinor = moneyToMinorUnits(item.price);
      console.log(JSON.stringify({
        mode: apply ? 'apply' : 'dry-run',
        planCode: item.planCode,
        productId,
        currentPrice: priceData.price ?? null,
        targetPrice: item.price,
        currency: priceData.currency ?? 'TRY',
        changeRequired: currentMinor !== expectedMinor,
      }));
      if (currentMinor !== expectedMinor && apply) {
        await client.updateProduct(productId, {
          priceData: { price: item.price, discount: false, discountedPrice: item.price, shippingPrice: '0.00' },
        });
      }
      const after = apply ? await client.getProduct(productId) : before;
      const verified = after?.priceData && typeof after.priceData === 'object' ? after.priceData : {};
      if (!isShopierProductActive(after)) {
        fail(`${item.planCode} ürünü Shopier'de aktif satışta değil.`);
      }
      if (apply && (moneyToMinorUnits(verified.price) !== expectedMinor
          || String(verified.currency || '').toUpperCase() !== 'TRY'
          || moneyToMinorUnits(verified.shippingPrice) !== 0
          || verified.discount === true)) {
        fail(`${item.planCode} güncelleme sonrası doğrulanamadı.`);
      }
    } catch (error) {
      fail(`${item.planCode} Shopier senkronizasyonu tamamlanamadı (${error?.code || 'unknown'}).`);
    }
  }
  if (!process.exitCode) {
    console.log(apply
      ? 'Shopier ürün fiyatları güncellendi ve tekrar doğrulandı.'
      : 'Dry-run tamamlandı. Değişiklik için aynı komutu --apply ile çalıştır.');
  }
}
