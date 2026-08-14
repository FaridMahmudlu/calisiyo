const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const output = path.resolve(__dirname, '..', 'tmp', 'landing-editorial-qa');

test.describe('Editorial landing page', () => {
  test.beforeAll(() => fs.mkdirSync(output, { recursive: true }));

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('calisiyo-cookie-consent-v1', 'rejected');
    });
  });

  test('content, pricing and FAQ interactions remain functional', async ({ page }) => {
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
    await expect(page.getByRole('heading', { level: 1 })).toContainText('YKS hazırlığını');
    await expect(page.getByRole('heading', { name: /Ücretsiz başla.*plus/ })).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(page.locator('.pricing-premium')).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'calisiyo.destek@gmail.com' })).toBeVisible();

    await page.getByRole('button', { name: /YKS 2028/ }).click();
    await expect(page.getByText(/1\.000/)).toBeVisible();

    const secondFaq = page.locator('.faq-list details').nth(1);
    await secondFaq.locator('summary').click();
    await expect(secondFaq).toHaveAttribute('open', '');

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(consoleErrors).toEqual([]);
    expect(failedResponses).toEqual([]);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true });
  });

  test('mobile and tablet layouts do not overflow', async ({ page }) => {
    for (const viewport of [{ width: 768, height: 1024 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(output, 'mobile.png'), fullPage: true });
  });

  test('SEO surface is indexable and structured data is valid JSON', async ({ page, request }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/YKS Çalışma Programı ve Koçu/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /calisiyo-theta\.vercel\.app\/?$/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Pomodoro/);
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(schemas.length).toBeGreaterThanOrEqual(2);
    for (const schema of schemas) expect(() => JSON.parse(schema)).not.toThrow();

    const robots = await request.get('/robots.txt');
    expect(robots.ok()).toBeTruthy();
    expect(await robots.text()).toContain('Sitemap:');
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.ok()).toBeTruthy();
    expect(await sitemap.text()).toContain('/paketler');
    const llms = await request.get('/llms.txt');
    expect(llms.ok()).toBeTruthy();
    expect(await llms.text()).toContain('calisiyo.destek@gmail.com');

    const protectedPage = await request.get('/giris', { maxRedirects: 0 });
    expect(protectedPage.headers()['x-robots-tag']).toContain('noindex');
  });
});
