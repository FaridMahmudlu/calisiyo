const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const output = path.resolve(__dirname, '..', 'tmp', 'landing-qa');

test.describe('Landing page', () => {
  test.beforeAll(() => fs.mkdirSync(output, { recursive: true }));

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('calisiyo-cookie-consent-v1', 'rejected');
    });
  });

  test('content, domain notice, pricing and FAQ interactions remain functional', async ({ page }) => {
    const consoleErrors = [];
    const failedResponses = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('response', (response) => {
      if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
    });

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Ne çalışacağını bil.');
    await expect(page.getByRole('heading', { name: /Tüm denemelerin tek yerde/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Ücretsiz başla.*plus/ })).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
    for (const exam of ['KDS', 'SDS', 'LGS', 'KPSS']) await expect(page.locator('.lp-exams li', { hasText: exam }).first()).toBeVisible();

    const notice = page.getByRole('complementary', { name: 'Adres değişikliği duyurusu' });
    await expect(notice).toContainText('planliyo.com.tr');
    await notice.getByRole('button', { name: 'Duyuruyu kapat' }).click();
    await expect(notice).toBeHidden();
    await page.reload();
    await expect(page.getByRole('complementary', { name: 'Adres değişikliği duyurusu' })).toBeHidden();

    await page.getByRole('button', { name: /YKS 2028/ }).click();
    await expect(page.getByText(/4\.500/)).toBeVisible();

    const secondFaq = page.locator('.lp-faq-list details').nth(1);
    await secondFaq.locator('summary').click();
    await expect(secondFaq).toHaveAttribute('open', '');

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(consoleErrors).toEqual([]);
    expect(failedResponses).toEqual([]);
    await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true });
  });

  test('mobile and tablet layouts do not overflow', async ({ page }) => {
    for (const viewport of [{ width: 820, height: 1180 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    await page.screenshot({ path: path.join(output, 'mobile.png'), fullPage: true });
  });

  test('SEO surface is indexable and structured data is valid JSON', async ({ page, request }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Deneme Analizi · Planliyo/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /planliyo\.com\.tr\/?$/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /KDS/);
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(schemas.length).toBeGreaterThanOrEqual(2);
    const types = schemas.flatMap((schema) => JSON.parse(schema)['@graph'].map((node) => node['@type']));
    for (const type of ['WebSite', 'Organization', 'SoftwareApplication', 'FAQPage', 'HowTo']) expect(types).toContain(type);

    const robots = await request.get('/robots.txt');
    expect(robots.ok()).toBeTruthy();
    expect(await robots.text()).toContain('Sitemap:');
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.ok()).toBeTruthy();
    expect(await sitemap.text()).toContain('/ozellikler/deneme-analizi');
    const llms = await request.get('/llms.txt');
    expect(llms.ok()).toBeTruthy();
    const llmsText = await llms.text();
    expect(llmsText).toContain('destek@planliyo.com.tr');
    expect(llmsText).toContain('LGS: net = doğru − yanlış / 3');

    const protectedPage = await request.get('/giris', { maxRedirects: 0 });
    expect(protectedPage.headers()['x-robots-tag']).toContain('noindex');
    const home = await request.get('/');
    expect(home.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  });
});
