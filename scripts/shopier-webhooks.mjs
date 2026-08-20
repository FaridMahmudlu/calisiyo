import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createShopierClient, SHOPIER_WEBHOOK_EVENTS } from '../lib/billing/shopier-core.mjs';

const token = String(process.env.SHOPIER_ACCESS_TOKEN || '').trim();
const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/$/, '');
const callbackUrl = `${siteUrl}/api/billing/shopier/webhook`;
const createMissing = process.argv.includes('--create');
const outputFlag = process.argv.indexOf('--secret-output');
const secretOutput = outputFlag >= 0 ? process.argv[outputFlag + 1] : '';

function stop(message) {
  console.error(`HATA: ${message}`);
  process.exit(1);
}

if (!token) stop('SHOPIER_ACCESS_TOKEN tanımlı değil.');
try {
  const parsed = new URL(siteUrl);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error('invalid');
} catch {
  stop('NEXT_PUBLIC_SITE_URL geçerli bir HTTPS production adresi olmalı.');
}
if (createMissing && !secretOutput) {
  stop('--create kullanırken webhook tokenlarını güvenli saklamak için --secret-output <dosya> zorunludur.');
}

const client = createShopierClient({ accessToken: token });
const existingResponse = await client.listWebhooks({ limit: 50 });
const existing = Array.isArray(existingResponse) ? existingResponse : [];
const safeExisting = existing.map((hook) => ({
  id: hook.id,
  event: hook.event,
  url: hook.url,
  active: hook.active ?? hook.status ?? null,
}));
console.log(JSON.stringify({ callbackUrl, webhooks: safeExisting }, null, 2));

const missing = SHOPIER_WEBHOOK_EVENTS.filter((event) => !existing.some(
  (hook) => hook.event === event && String(hook.url || '').replace(/\/$/, '') === callbackUrl,
));
if (!missing.length) {
  console.log('Gerekli Shopier webhookları zaten kayıtlı; yeni kayıt oluşturulmadı.');
  process.exit(0);
}
if (!createMissing) {
  console.error(`Eksik webhooklar: ${missing.join(', ')}. Kayıt için --create --secret-output <dosya> kullan.`);
  process.exit(2);
}

const outputPath = resolve(secretOutput);
const createdSecrets = {};
try {
  await writeFile(outputPath, '{}\n', { encoding: 'utf8', mode: 0o600, flag: 'wx' });
} catch (error) {
  if (error?.code === 'EEXIST') stop('Gizli token dosyası zaten var; üzerine yazılmadı. Yeni ve güvenli bir dosya yolu seç.');
  stop('Gizli token dosyası güvenli biçimde oluşturulamadı.');
}
for (const event of missing) {
  const created = await client.createWebhook({ event, url: callbackUrl });
  const webhookToken = String(created?.token || '').trim();
  if (!webhookToken) stop(`${event} kaydı oluştu fakat tek kullanımlık webhook tokenı alınamadı; Shopier panelini kontrol et.`);
  createdSecrets[event] = webhookToken;
  await writeFile(outputPath, `${JSON.stringify(createdSecrets, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  console.log(JSON.stringify({ id: created.id, event: created.event || event, url: created.url || callbackUrl }));
}
console.log(`Webhooklar oluşturuldu. Tokenlar konsola yazılmadı; güvenli dosyaya kaydedildi: ${outputPath}`);
