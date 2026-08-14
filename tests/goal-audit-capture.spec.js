const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const email = process.env.QA_EMAIL;
const password = process.env.QA_PASSWORD;
const output = path.resolve(__dirname, '..', 'tmp', 'goal-audit');

async function login(page) {
  await page.addInitScript(() => window.localStorage.setItem('calisiyo-cookie-consent-v1', 'rejected'));
  await page.goto('/giris');
  await page.getByLabel('E-posta').fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.locator('.auth-submit').click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function capture(page, name) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
}

test('capture current goal audit surfaces', async ({ page }) => {
  test.skip(!email || !password, 'QA credentials are required.');
  fs.mkdirSync(output, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page);

  await expect(page.locator('.study-streak')).toBeVisible();
  await capture(page, 'dashboard-desktop-before');

  await page.goto('/dashboard/istatistikler');
  await expect(page.getByRole('heading', { name: 'İstatistikler' })).toBeVisible();
  await capture(page, 'statistics-desktop-before');

  await page.goto('/dashboard/deneme-analizi');
  await expect(page.getByRole('heading', { name: 'Deneme Analizi' })).toBeVisible();
  const addExam = page.getByRole('button', { name: /deneme ekle/i }).first();
  if (await addExam.count()) {
    await addExam.click();
    await expect(page.getByRole('heading', { name: /Yeni .* Denemesi/ })).toBeVisible();
    await capture(page, 'exam-dialog-desktop-before');
  }

  await page.goto('/dashboard/kaynaklarim');
  await expect(page.getByRole('heading', { name: 'Kaynaklarım' })).toBeVisible();
  await page.getByRole('button', { name: /YouTube.*plan/i }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await capture(page, 'youtube-dialog-desktop-before');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard');
  await expect(page.locator('.study-streak')).toBeHidden();
  await page.getByRole('button', { name: 'Menüyü aç' }).click();
  await expect(page.locator('.study-streak')).toBeVisible();
  await capture(page, 'dashboard-mobile-menu-before');
});
