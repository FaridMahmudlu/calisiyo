const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const canonicalOrigin = 'https://calisiyo-theta.vercel.app';
const publicRoutes = [
  '/',
  '/paketler',
  '/rehber',
  '/rehber/yks-calisma-programi',
  '/rehber/yks-deneme-analizi',
  '/rehber/yks-konu-takibi',
  '/rehber/yks-calisma-suresi-takibi',
  '/metodoloji',
  '/iletisim',
  '/gizlilik',
  '/kvkk',
  '/kullanim-sartlari',
  '/cerez-politikasi',
  '/on-bilgilendirme',
  '/mesafeli-satis',
  '/iptal-iade',
];

test.describe('SEO and AI-search readiness', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('calisiyo-cookie-consent-v1', 'rejected'));
  });

  test('indexable routes have one H1, unique metadata, canonical URLs and valid JSON-LD', async ({ page }) => {
    const keyRoutes = ['/', '/paketler', '/rehber', '/rehber/yks-calisma-programi', '/rehber/yks-deneme-analizi', '/rehber/yks-konu-takibi', '/rehber/yks-calisma-suresi-takibi', '/metodoloji'];
    const titles = new Set();
    const descriptions = new Set();

    for (const route of keyRoutes) {
      await page.goto(route);
      await expect(page.locator('h1')).toHaveCount(1);
      const title = await page.title();
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(title.length).toBeGreaterThan(20);
      expect(description.length).toBeGreaterThan(70);
      expect(canonical.replace(/\/$/, '')).toBe(new URL(route, `${canonicalOrigin}/`).toString().replace(/\/$/, ''));
      expect(titles.has(title)).toBe(false);
      expect(descriptions.has(description)).toBe(false);
      titles.add(title);
      descriptions.add(description);

      const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
      expect(schemas.length).toBeGreaterThan(0);
      for (const source of schemas) {
        const schema = JSON.parse(source);
        expect(JSON.stringify(schema)).not.toMatch(/aggregateRating|reviewCount|ratingValue/);
        expect(JSON.stringify(schema)).not.toContain('localhost');
      }
    }
  });

  test('sitemap contains only canonical public routes with explicit truthful dates', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.ok()).toBeTruthy();
    const xml = await response.text();
    const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toEqual(publicRoutes.map((route) => new URL(route, `${canonicalOrigin}/`).toString()));
    expect(xml).not.toMatch(/dashboard|admin|\/api\/|\/giris|\/kayit/);
    expect(xml).not.toMatch(/<priority>|<changefreq>/);
    expect((xml.match(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g) || []).length).toBe(publicRoutes.length);

    const sitemapSource = fs.readFileSync(path.join(root, 'app', 'sitemap.js'), 'utf8');
    expect(sitemapSource).not.toContain('new Date()');
  });

  test('robots allows public crawlers while private surfaces keep noindex protection', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    const text = await robots.text();
    expect(robots.ok()).toBeTruthy();
    expect(text).toContain('User-Agent: *');
    expect(text).toContain('Allow: /');
    expect(text).toContain('Disallow: /dashboard/');
    expect(text).toContain('Disallow: /admin/');
    expect(text).toContain('Disallow: /api/');
    expect(text).toContain(`Sitemap: ${canonicalOrigin}/sitemap.xml`);
    expect(text).not.toMatch(/User-Agent: OAI-SearchBot[\s\S]*Disallow: \/$/);

    for (const route of ['/giris', '/kayit', '/auth/hata', '/dashboard']) {
      const response = await request.get(route, { maxRedirects: 0 });
      expect(response.headers()['x-robots-tag']).toContain('noindex');
    }
  });

  test('important facts are present in source HTML and stale exam claims are absent', async ({ request }) => {
    const home = await (await request.get('/')).text();
    const packages = await (await request.get('/paketler')).text();
    const guide = await (await request.get('/rehber/yks-calisma-programi')).text();
    const llms = await (await request.get('/llms.txt')).text();

    expect(home).toContain('2027 YKS hazırlığı');
    expect(home).not.toContain('19 Haziran 2027 YKS');
    expect(packages).toContain('YKS 2027');
    expect(packages).toContain('YKS 2028');
    expect(packages).toMatch(/2\.500/);
    expect(packages).toMatch(/4\.500/);
    expect(guide).toContain('Kısa cevap');
    expect(guide).toContain('ÖSYM Sınav Takvimi');
    expect(llms).not.toMatch(/Tahmini YKS tarihi|1\.500 TL|19 Haziran 2027/);
    expect(llms).toContain('/paketler');
  });

  test('normal, Googlebot, Bingbot and OAI-SearchBot receive the same public facts', async ({ request }) => {
    const agents = [
      'Mozilla/5.0 Chrome/140 Safari/537.36',
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot',
    ];

    for (const userAgent of agents) {
      const response = await request.get('/rehber/yks-calisma-programi', { headers: { 'user-agent': userAgent } });
      const html = await response.text();
      expect(response.status()).toBe(200);
      expect(html).toContain('YKS çalışma programı nasıl hazırlanır?');
      expect(html).toContain('Kısa cevap');
      expect(html).toContain('Programını calisiyo’da oluşturmaya başla');
    }
  });

  test('public content links resolve and mobile layouts do not overflow', async ({ page, request }) => {
    const paths = ['/rehber', '/rehber/yks-calisma-programi', '/metodoloji', '/paketler'];
    const internalLinks = new Set();

    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of paths) {
      await page.goto(route);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      for (const href of await page.locator('a[href^="/"]').evaluateAll((links) => links.map((link) => link.getAttribute('href')))) {
        if (href && !href.startsWith('/dashboard')) internalLinks.add(href.split('#')[0]);
      }
    }

    for (const href of internalLinks) {
      const response = await request.get(href, { maxRedirects: 0 });
      expect(response.status(), `Broken internal link: ${href}`).toBeLessThan(400);
    }
  });
});
