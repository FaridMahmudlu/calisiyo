const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const email = process.env.QA_EMAIL;
const password = process.env.QA_PASSWORD;
const output = path.resolve(__dirname, '..', 'tmp', 'saas-qa');

async function login(page, next = '') {
  await page.goto(`/giris${next ? `?next=${encodeURIComponent(next)}` : ''}`);
  await page.getByLabel('E-posta').fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole('button', { name: 'Giriş Yap' }).click();
}

test.describe('SaaS pricing, legal and billing safety', () => {
  test('public pricing is responsive, factual and consent-gated', async ({ page }) => {
    const analyticsRequests = [];
    page.on('request', (request) => {
      if (/posthog|google-analytics|googletagmanager/.test(request.url())) analyticsRequests.push(request.url());
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/paketler');
    await expect(page.getByRole('heading', { name: /İki plan/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'calisiyo ücretsiz' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'calisiyo plus' })).toBeVisible();
    await expect(page.getByText(/₺2\.500/)).toBeVisible();
    await page.getByRole('button', { name: /YKS 2028/ }).click();
    await expect(page.getByText(/₺1\.500/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'calisiyo.destek@gmail.com' })).toBeVisible();
    await expect(page.getByText(/Şehit ve gazi yakınlarından/)).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Çerez tercihleri' })).toBeVisible();
    expect(analyticsRequests).toHaveLength(0);
    await page.getByRole('button', { name: /Yalnızca zorunlu/ }).click();
    await expect(page.getByRole('dialog', { name: 'Çerez tercihleri' })).toHaveCount(0);
    await page.screenshot({ path: path.join(output, 'pricing-desktop.png'), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(output, 'pricing-mobile.png'), fullPage: true });
    await page.getByRole('button', { name: 'Çerez tercihleri' }).click();
    await expect(page.getByRole('dialog', { name: 'Çerez tercihleri' })).toBeVisible();
  });

  test('landing update is captured against the approved visual baseline', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.addInitScript(() => window.localStorage.setItem('calisiyo-cookie-consent-v1', 'rejected'));
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(async () => {
      const pause = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
      for (let y = 0; y < document.documentElement.scrollHeight; y += Math.max(500, window.innerHeight * 0.72)) {
        window.scrollTo({ top: y, behavior: 'instant' });
        await pause(80);
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
    await page.waitForTimeout(500);
    const currentPath = path.join(output, 'landing-updated-desktop.png');
    await page.screenshot({ path: currentPath, fullPage: true });

    const baselinePath = path.resolve(__dirname, '..', 'design-references', 'qa', 'landing-story-desktop.png');
    const dataUrl = (filePath) => `data:image/png;base64,${fs.readFileSync(filePath).toString('base64')}`;
    await page.setContent(`<!doctype html><html><head><style>
      *{box-sizing:border-box}body{margin:0;background:#eef4f1;font:600 15px Arial;color:#10251f}
      header{position:sticky;top:0;z-index:2;padding:14px 20px;background:#10251f;color:#fff;display:grid;grid-template-columns:1fr 1fr;gap:20px}
      main{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px;align-items:start}
      img{display:block;width:100%;height:auto;border:1px solid #bfd2ca;background:#fff}
    </style></head><body><header><span>Referans</span><span>Güncel prototip</span></header><main>
      <img alt="Referans" src="${dataUrl(baselinePath)}"><img alt="Güncel prototip" src="${dataUrl(currentPath)}">
    </main></body></html>`);
    await page.screenshot({ path: path.join(output, 'landing-comparison.png'), fullPage: true });
  });

  test('anonymous billing API never exposes secrets or enables unconfigured checkout', async ({ request }) => {
    const response = await request.get('/api/billing');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.authenticated).toBe(false);
    expect(body.checkoutEnabled).toBe(false);
    expect(body.plans.map((plan) => plan.code)).toEqual(['baslangic', 'plus']);
    expect(JSON.stringify(body)).not.toMatch(/secret|service_role|apiKey/i);
  });

  test('protected plan choice survives login and checkout fails closed', async ({ page }) => {
    test.skip(!email || !password, 'QA credentials are required.');
    await page.goto('/dashboard/abonelik?plan=plus_2027');
    await expect(page).toHaveURL(/\/giris\?next=/);
    await login(page, '/dashboard/abonelik?plan=plus_2027');
    await expect(page).toHaveURL(/\/dashboard\/abonelik\?plan=plus_2027/);
    await expect(page.getByRole('heading', { name: 'İki plan, tek net seçim' })).toBeVisible();
    await page.getByRole('button', { name: /Satın al/ }).click();
    await expect(page.getByRole('dialog', { name: /calisiyo plus · YKS 2027/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Shopier ile ödemeye geç/ })).toBeDisabled();
    await expect(page.getByText('Satışa hazırlık tamamlanıyor')).toBeVisible();
    const billing = await page.evaluate(async () => (await fetch('/api/billing')).json());
    expect(billing.currentPlan.code).toBe('baslangic');
    expect(billing.checkoutEnabled).toBe(false);
    const createAttempt = await page.evaluate(async () => {
      const response = await fetch('/api/billing/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planCode: 'plus_2027', billingPeriod: 'yks_2027', acceptImmediateService: true, confirmAdultOrGuardian: true }),
      });
      return { status: response.status, body: await response.json() };
    });
    expect(createAttempt.status).toBe(503);
    expect(createAttempt.body.code).toBe('checkout_not_ready');
    await page.screenshot({ path: path.join(output, 'billing-disabled-safe.png'), fullPage: true });
  });

  test('premium markers explain locked limits instead of acting like dead controls', async ({ page }) => {
    test.skip(!email || !password, 'QA credentials are required.');
    await login(page);
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('/dashboard/istatistikler');
    await expect(page).toHaveURL(/\/dashboard\/istatistikler/);

    await page.getByRole('button', { name: /Plus ile indir/ }).click();
    await expect(page.getByRole('dialog', { name: /CSV ilerleme raporu · Premium/ })).toBeVisible();
    await page.getByRole('button', { name: 'Pencereyi kapat' }).click();

    await page.getByRole('button', { name: /Tümü/ }).click();
    await expect(page.getByRole('dialog', { name: /Tüm istatistik geçmişi · Premium/ })).toBeVisible();
    await page.getByRole('button', { name: 'Pencereyi kapat' }).click();

    await page.goto('/dashboard/kaynaklarim');
    await page.getByRole('button', { name: /Premium limitleri/ }).click();
    await expect(page.getByRole('dialog', { name: /YouTube çalışma planı limitleri · Premium/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Plus’ı incele/ })).toHaveAttribute('href', '/dashboard/abonelik');
  });
});
