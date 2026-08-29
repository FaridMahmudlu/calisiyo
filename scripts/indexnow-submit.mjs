const origin = normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL);
const key = String(process.env.INDEXNOW_KEY || '').trim();

if (!origin || !key) {
  console.log('IndexNow atlandı: NEXT_PUBLIC_SITE_URL ve INDEXNOW_KEY gerekli.');
  process.exit(0);
}

if (!/^[A-Za-z0-9-]{8,128}$/.test(key)) {
  throw new Error('INDEXNOW_KEY geçerli bir anahtar biçiminde değil.');
}

const requested = process.argv.slice(2);
const urls = requested.includes('--all') ? await urlsFromSitemap(origin) : requested.filter((item) => item !== '--all').map((item) => sameOriginUrl(item, origin));
const uniqueUrls = [...new Set(urls)];

if (!uniqueUrls.length) {
  console.log('IndexNow atlandı: Gönderilecek URL yok. Belirli yollar ekleyin veya --all kullanın.');
  process.exit(0);
}

const keyLocation = process.env.INDEXNOW_KEY_LOCATION
  ? sameOriginUrl(process.env.INDEXNOW_KEY_LOCATION, origin)
  : `${origin}/${key}.txt`;

const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(origin).host, key, keyLocation, urlList: uniqueUrls }),
});

if (!response.ok) {
  throw new Error(`IndexNow isteği başarısız oldu (${response.status}).`);
}

console.log(`IndexNow: ${uniqueUrls.length} URL kabul edildi (${response.status}).`);

function normalizeOrigin(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    return url.origin;
  } catch { return null; }
}

function sameOriginUrl(value, expectedOrigin) {
  const url = new URL(value, expectedOrigin);
  if (url.origin !== expectedOrigin || url.protocol !== 'https:') throw new Error(`IndexNow yalnızca ${expectedOrigin} URL'lerini kabul eder.`);
  url.hash = '';
  return url.toString();
}

async function urlsFromSitemap(expectedOrigin) {
  const response = await fetch(`${expectedOrigin}/sitemap.xml`);
  if (!response.ok) throw new Error(`Sitemap alınamadı (${response.status}).`);
  const xml = await response.text();
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => sameOriginUrl(match[1], expectedOrigin));
}
