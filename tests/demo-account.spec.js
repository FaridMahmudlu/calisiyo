const { test, expect } = require('@playwright/test');
const path = require('path');

const baseURL = process.env.BASE_URL || 'http://localhost:3000';
const demoName = process.env.DEMO_NAME || 'Mert Kaya';
const minimumStreak = Number(process.env.DEMO_MINIMUM_STREAK || 30);
const qaDir = path.resolve(__dirname, '..', 'design-references', 'qa');

test('realistic demo account renders live dashboard and statistics', async ({ page }) => {
  test.skip(!process.env.DEMO_EMAIL || !process.env.DEMO_PASSWORD, 'Demo credentials are required.');
  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.goto(`${baseURL}/giris`);
  await page.getByLabel('E-posta').fill(process.env.DEMO_EMAIL);
  await page.locator('input[autocomplete="current-password"]').fill(process.env.DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Giriş Yap' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText(demoName).first()).toBeVisible();
  await expect(page.getByText(/Tahmini 19 Haziran 2027/)).toBeVisible();
  await expect(page.getByText(new RegExp(`${minimumStreak} günlük seri`)).first()).toBeVisible();
  await page.screenshot({ path: path.join(qaDir, 'demo-dashboard-desktop.png'), fullPage: true });

  await page.goto(`${baseURL}/dashboard/istatistikler`);
  await expect(page.getByRole('heading', { name: 'İstatistikler' })).toBeVisible();
  await expect(page.getByText('Canlı veri')).toBeVisible();
  await expect(page.getByText('Deneme geçmişi')).toBeVisible();
  await expect(page.locator('.global-error')).toHaveCount(0);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(qaDir, 'demo-istatistikler-desktop.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'İstatistikler' })).toBeVisible();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(qaDir, 'demo-istatistikler-mobile.png'), fullPage: true });
});
