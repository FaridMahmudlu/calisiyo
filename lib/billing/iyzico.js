import 'server-only';
import { createHmac, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

function getIyzicoConfig() {
  const apiKey = process.env.IYZICO_API_KEY;
  const secretKey = process.env.IYZICO_SECRET_KEY;
  const sandbox = process.env.IYZICO_ENVIRONMENT !== 'production';
  const baseUrl = process.env.IYZICO_API_URL
    || (sandbox ? 'https://sandbox-api.iyzipay.com' : 'https://api.iyzipay.com');
  if (!apiKey || !secretKey) throw new Error('İyzico yapılandırması tamamlanmamış.');
  return { apiKey, secretKey, baseUrl };
}

function authorizationHeaders(uriPath, signatureBody = {}) {
  const { apiKey, secretKey } = getIyzicoConfig();
  const randomKey = `${Date.now()}${randomBytes(8).toString('hex')}`;
  const signature = createHmac('sha256', secretKey)
    .update(`${randomKey}${uriPath}${JSON.stringify(signatureBody)}`)
    .digest('hex');
  const authorization = Buffer.from(
    `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`,
    'utf8',
  ).toString('base64');
  return {
    Authorization: `IYZWSv2 ${authorization}`,
    'Content-Type': 'application/json',
    'x-iyzi-rnd': randomKey,
  };
}

async function iyzicoRequest(uriPath, { method = 'GET', payload, query } = {}) {
  const { baseUrl } = getIyzicoConfig();
  const body = payload === undefined ? undefined : JSON.stringify(payload);
  const queryString = query ? `?${new URLSearchParams(query)}` : '';
  const response = await fetch(`${baseUrl}${uriPath}${queryString}`, {
    method,
    headers: authorizationHeaders(uriPath, payload ?? {}),
    body,
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.status !== 'success') {
    const error = new Error(result?.errorMessage || 'İyzico isteği tamamlanamadı.');
    error.code = result?.errorCode || `HTTP_${response.status}`;
    throw error;
  }
  return result;
}

let cachedProductImage;
async function productImage() {
  if (cachedProductImage) return cachedProductImage;
  const file = await readFile(path.join(process.cwd(), 'public', 'brand', 'og-image.png'));
  cachedProductImage = file.toString('base64');
  return cachedProductImage;
}

export async function createOrderPaymentLink({ orderNumber, planName, periodLabel, amount }) {
  const uriPath = '/v2/iyzilink/products';
  const result = await iyzicoRequest(uriPath, {
    method: 'POST',
    payload: {
      conversationId: orderNumber,
      locale: 'tr',
      name: `calisiyo ${planName}`,
      description: `${orderNumber} · ${planName} · ${periodLabel} ön ödemeli dijital erişim`,
      price: Number(amount).toFixed(2),
      currencyCode: 'TRY',
      encodedImageFile: await productImage(),
      addressIgnorable: true,
      installmentRequested: false,
      stockEnabled: true,
      stockCount: 1,
      flexibleLink: false,
      categoryType: 'UNKNOWN',
    },
  });
  if (!result?.data?.token || !result?.data?.url) throw new Error('İyzico ödeme bağlantısı oluşturmadı.');
  return result.data;
}

export async function getPaymentLinkDetails(token, conversationId) {
  if (!/^[A-Za-z0-9_-]{2,128}$/.test(String(token || ''))) throw new Error('Geçersiz İyzico link belirteci.');
  return (await iyzicoRequest(`/v2/iyzilink/products/${encodeURIComponent(token)}`, {
    query: { locale: 'tr', conversationId },
  })).data;
}

export async function deletePaymentLink(token, conversationId) {
  if (!/^[A-Za-z0-9_-]{2,128}$/.test(String(token || ''))) return;
  await iyzicoRequest(`/v2/iyzilink/products/${encodeURIComponent(token)}`, {
    method: 'DELETE',
    query: { locale: 'tr', conversationId },
  });
}
