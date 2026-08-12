const { test, expect } = require('@playwright/test');
const path = require('path');

const baseURL = process.env.BASE_URL || 'http://localhost:3000';
const email = process.env.QA_EMAIL;
const password = process.env.QA_PASSWORD;
const expectedName = process.env.QA_NAME || 'Emir Kaya';
const evidenceDir = path.resolve(__dirname, '..', 'design-references', 'qa-audit-2026-08-12');

test('capture stable authenticated QA evidence', async ({ page }) => {
  test.skip(!email || !password, 'QA_EMAIL and QA_PASSWORD are required.');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${baseURL}/giris`);
  await page.getByLabel('E-posta').fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole('button', { name: 'Giriş Yap' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText(expectedName).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: /Merhaba Emir/ })).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, '02-dashboard-authenticated.png'), fullPage: true });

  await page.goto(`${baseURL}/dashboard/istatistikler`);
  await expect(page.getByRole('heading', { name: 'İstatistikler' })).toBeVisible();
  await expect(page.getByText('Canlı veri')).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, '03-statistics-desktop.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseURL}/dashboard/istatistikler`);
  await expect(page.getByRole('heading', { name: 'İstatistikler' })).toBeVisible();
  await expect(page.getByText('Canlı veri')).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, '04-statistics-mobile.png'), fullPage: true });
});
