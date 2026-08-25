import { createShopierClient, moneyToMinorUnits } from '../lib/billing/shopier-core.mjs';

const apply = process.argv.includes('--apply');
const expected = [
  { planCode: 'plus_2027', productId: process.env.SHOPIER_PRODUCT_ID_2027, price: '2500.00' },
  { planCode: 'plus_2028', productId: process.env.SHOPIER_PRODUCT_ID_2028, price: '1500.00' },
];

function fail(message) {
  console.error(`HATA: ${message}`);
  process.exitCode = 1;
}

const token = String(process.env.SHOPIER_ACCESS_TOKEN || '').trim();
if (!token) {
  fail('SHOPIER_ACCESS_TOKEN tanımlı değil.');
} else if (expected.some((item) => !/^[A-Za-z0-9_-]{1,128}$/.test(String(item.productId || '')))) {
  fail('SHOPIER_PRODUCT_ID_2027 ve SHOPIER_PRODUCT_ID_2028 tanımlı olmalı.');
} else {
  const client = createShopierClient({ accessToken: token, timeoutMs: 10_000 });
  for (const item of expected) {
    try {
      const before = await client.getProduct(item.productId);
      const priceData = before?.priceData && typeof before.priceData === 'object' ? before.priceData : {};
      const currentMinor = moneyToMinorUnits(priceData.price);
      const expectedMinor = moneyToMinorUnits(item.price);
      console.log(JSON.stringify({
        mode: apply ? 'apply' : 'dry-run',
        planCode: item.planCode,
        productId: item.productId,
        currentPrice: priceData.price ?? null,
        targetPrice: item.price,
        currency: priceData.currency ?? 'TRY',
        changeRequired: currentMinor !== expectedMinor,
      }));
      if (currentMinor !== expectedMinor && apply) {
        await client.updateProduct(item.productId, {
          priceData: { price: item.price, discount: false, discountedPrice: item.price, shippingPrice: '0.00' },
        });
      }
      const after = apply ? await client.getProduct(item.productId) : before;
      const verified = after?.priceData && typeof after.priceData === 'object' ? after.priceData : {};
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
