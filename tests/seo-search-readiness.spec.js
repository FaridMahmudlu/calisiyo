const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const featureRoutes = [
  '/ozellikler/youtube-calisma-plani', '/ozellikler/calisma-siniflari', '/ozellikler/yks-planlama',
  '/ozellikler/kronometre-ve-istatistikler', '/ozellikler/deneme-analizi', '/ozellikler/konu-takibi',
];
const guideRoutes = [
  '/rehber/yks-calisma-programi', '/rehber/yks-deneme-analizi', '/rehber/yks-konu-takibi',
  '/rehber/yks-calisma-suresi-takibi', '/rehber/youtube-kampini-calisma-programina-donusturme',
  '/rehber/calisma-sinifi-ile-birlikte-calisma',
];
const publicRoutes = [
  '/', '/hakkimizda', '/ozellikler', ...featureRoutes, '/paketler', '/rehber', ...guideRoutes,
  '/metodoloji', '/iletisim', '/gizlilik', '/kvkk', '/kullanim-sartlari', '/cerez-politikasi',
  '/on-bilgilendirme', '/mesafeli-satis', '/iptal-iade',
];

async function canonicalOrigin(request) {
  const html = await (await request.get('/')).text();
  const tag = html.match(/<link[^>]+rel="canonical"[^>]*>/i)?.[0] || html.match(/<link[^>]+href="[^"]+"[^>]+rel="canonical"[^>]*>/i)?.[0];
  const href = tag?.match(/href="([^"]+)"/i)?.[1];
  if (!href) throw new Error('Ana sayfa canonical etiketi bulunamadı.');
  return new URL(href).origin;
}

test.describe('SEO and AI-search readiness', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('calisiyo-cookie-consent-v1', 'rejected'));
  });

  test('indexable product and editorial routes expose unique metadata, one H1, canonical and valid JSON-LD', async ({ page, request }) => {
    const origin = await canonicalOrigin(request);
    const keyRoutes = ['/', '/hakkimizda', '/ozellikler', ...featureRoutes, '/paketler', '/rehber', ...guideRoutes, '/metodoloji'];
    const titles = new Set();
    const descriptions = new Set();
    for (const route of keyRoutes) {
      await page.goto(route);
      await expect(page.locator('h1')).toHaveCount(1);
      const title = await page.title();
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(title.length, route).toBeGreaterThan(20);
      expect(description.length, route).toBeGreaterThan(70);
      expect(canonical.replace(/\/$/, ''), route).toBe(new URL(route, `${origin}/`).toString().replace(/\/$/, ''));
      expect(titles.has(title), `Duplicate title: ${title}`).toBe(false);
      expect(descriptions.has(description), `Duplicate description: ${description}`).toBe(false);
      titles.add(title);
      descriptions.add(description);
      const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
      expect(schemas.length, route).toBeGreaterThan(0);
      for (const source of schemas) {
        const serialized = JSON.stringify(JSON.parse(source));
        expect(serialized).not.toMatch(/aggregateRating|reviewCount|ratingValue/);
        expect(serialized).not.toContain('localhost');
      }
    }
  });

  test('sitemap contains exactly the maintained public route set with explicit dates', async ({ request }) => {
    const origin = await canonicalOrigin(request);
    const response = await request.get('/sitemap.xml');
    expect(response.ok()).toBeTruthy();
    const xml = await response.text();
    const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toEqual(publicRoutes.map((route) => new URL(route, `${origin}/`).toString()));
    expect(xml).not.toMatch(/dashboard|admin|\/api\/|\/giris|\/kayit/);
    expect(xml).not.toMatch(/<priority>|<changefreq>/);
    expect((xml.match(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g) || []).length).toBe(publicRoutes.length);
    expect(fs.readFileSync(path.join(root, 'app', 'sitemap.js'), 'utf8')).not.toContain('new Date()');
  });

  test('robots permits public search crawlers and private surfaces retain noindex', async ({ request }) => {
    const origin = await canonicalOrigin(request);
    const robots = await request.get('/robots.txt');
    const text = await robots.text();
    expect(robots.ok()).toBeTruthy();
    expect(text).toContain('User-Agent: *');
    expect(text).toContain('Allow: /');
    expect(text).toContain('Disallow: /dashboard/');
    expect(text).toContain('Disallow: /admin/');
    expect(text).toContain('Disallow: /api/');
    expect(text).toContain(`Sitemap: ${origin}/sitemap.xml`);
    expect(text).not.toMatch(/User-Agent: OAI-SearchBot[\s\S]*Disallow: \/$/);
    for (const route of ['/giris', '/kayit', '/auth/hata', '/dashboard']) {
      const response = await request.get(route, { maxRedirects: 0 });
      expect(response.headers()['x-robots-tag'], route).toContain('noindex');
    }
  });

  test('server HTML contains product facts, answer-first content and no unsafe future YKS claim', async ({ request }) => {
    const home = await (await request.get('/')).text();
    const youtube = await (await request.get('/ozellikler/youtube-calisma-plani')).text();
    const classroom = await (await request.get('/ozellikler/calisma-siniflari')).text();
    const exam = await (await request.get('/ozellikler/deneme-analizi')).text();
    const guide = await (await request.get('/rehber/yks-calisma-programi')).text();
    const llms = await (await request.get('/llms.txt')).text();
    expect(home).toContain('2027 YKS hazırlığı');
    expect(home).not.toContain('19 Haziran 2027 YKS');
    expect(youtube).toContain('başlangıç videosu');
    expect(youtube).toContain('15–360');
    expect(classroom).toContain('en fazla 50 üyeye');
    expect(classroom).toContain('metin–görsel–dosya–ses');
    expect(exam).toContain('doğru − yanlış/4');
    expect(guide).toContain('Kısa cevap');
    expect(guide).toContain('ÖSYM Sınav Takvimi');
    expect(llms).not.toMatch(/Tahmini YKS tarihi|19 Haziran 2027|puan garantisi verir/);
    expect(llms).toContain('/ozellikler');
    expect(llms).toContain('/hakkimizda');
  });

  test('llms.txt follows configured canonical origin and is plain text', async ({ request }) => {
    const origin = await canonicalOrigin(request);
    const response = await request.get('/llms.txt');
    const text = await response.text();
    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('text/plain');
    for (const link of [...text.matchAll(/https:\/\/[^\s)]+/g)].map((match) => match[0])) expect(new URL(link).origin).toBe(origin);
    expect(text).not.toContain('localhost');
  });

  test('normal, Googlebot, Bingbot and OAI-SearchBot receive the same public answer', async ({ request }) => {
    const agents = ['Mozilla/5.0 Chrome/140 Safari/537.36', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)', 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot'];
    for (const route of ['/rehber/yks-calisma-programi', '/ozellikler/youtube-calisma-plani']) {
      const h1s = [];
      for (const userAgent of agents) {
        const response = await request.get(route, { headers: { 'user-agent': userAgent } });
        const html = await response.text();
        expect(response.status()).toBe(200);
        expect(html).toContain(route.includes('/rehber/') ? 'Kısa cevap' : 'Bu özellik ne yapar?');
        h1s.push(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1].replace(/<[^>]+>/g, ''));
      }
      expect(new Set(h1s).size).toBe(1);
    }
  });

  test('public internal links resolve and 390px layouts do not overflow', async ({ page, request }) => {
    const paths = ['/', '/hakkimizda', '/ozellikler', ...featureRoutes, '/rehber', ...guideRoutes, '/metodoloji', '/paketler'];
    const internalLinks = new Set();
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of paths) {
      await page.goto(route);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), { message: `Horizontal overflow: ${route}` }).toBe(true);
      for (const href of await page.locator('a[href^="/"]').evaluateAll((links) => links.map((link) => link.getAttribute('href')))) {
        if (href && !href.startsWith('/dashboard')) internalLinks.add(href.split('#')[0]);
      }
    }
    for (const href of internalLinks) {
      const response = await request.get(href, { maxRedirects: 0 });
      expect(response.status(), `Broken internal link: ${href}`).toBeLessThan(400);
    }
  });

  test('IndexNow helper is explicit, same-origin guarded and safe when unconfigured', async () => {
    const source = fs.readFileSync(path.join(root, 'scripts', 'indexnow-submit.mjs'), 'utf8');
    expect(source).toContain('NEXT_PUBLIC_SITE_URL');
    expect(source).toContain('INDEXNOW_KEY');
    expect(source).toContain('url.origin !== expectedOrigin');
    expect(source).toContain('process.exit(0)');
    expect(source).not.toMatch(/INDEXNOW_KEY\s*=\s*['"][A-Za-z0-9-]{8,}/);
  });
});
