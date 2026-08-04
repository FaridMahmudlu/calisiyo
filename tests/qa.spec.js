const { test, expect } = require('@playwright/test');
const path = require('path');

const baseURL = 'http://127.0.0.1:3100';
const qaDir = path.resolve(__dirname, '..', 'design-references', 'qa');

test('public auth, protected navigation, daily CRUD and responsive visuals', async ({ page }) => {
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('Failed to load resource')) {
      browserErrors.push(`console: ${message.text()}`);
    }
  });
  page.on('response', (response) => {
    if (response.status() >= 400) browserErrors.push(`response ${response.status()}: ${response.url()}`);
  });

  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.goto(`${baseURL}/giris`);
  await expect(page.getByRole('heading', { name: 'Tekrar hoş geldin' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Google ile devam et' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Apple ile devam et' })).toBeVisible();
  await page.screenshot({ path: path.join(qaDir, 'giris-desktop.png') });

  await page.goto(`${baseURL}/kayit`);
  await expect(page.getByRole('heading', { name: 'Hesap oluştur' })).toBeVisible();
  await page.getByLabel('Ad Soyad').fill('Kayıt QA Öğrencisi');
  await page.getByLabel('E-posta').fill(process.env.SIGNUP_EMAIL);
  await page.locator('input[autocomplete="new-password"]').nth(0).fill(process.env.QA_PASSWORD);
  await page.locator('input[autocomplete="new-password"]').nth(1).fill(process.env.QA_PASSWORD);
  await page.getByRole('button', { name: 'Devam Et', exact: true }).click();
  await page.getByRole('button', { name: /^Sayısal/ }).click();
  await page.getByRole('button', { name: 'Hesabı Oluştur' }).click();
  await page.waitForTimeout(800);
  if (new URL(page.url()).pathname === '/dashboard') {
    await expect(page.getByRole('button', { name: 'Çıkış yap' })).toBeVisible();
    await page.getByRole('button', { name: 'Çıkış yap' }).click();
    await expect(page).toHaveURL(/\/giris$/);
  } else {
    await expect(
      page.getByRole('heading', { name: 'E-postanı kontrol et' }).or(page.getByRole('alert'))
    ).toBeVisible();
  }

  await page.goto(`${baseURL}/giris`);
  await page.getByLabel('E-posta').fill(process.env.QA_EMAIL);
  await page.locator('input[autocomplete="current-password"]').fill(process.env.QA_PASSWORD);
  await page.getByRole('button', { name: 'Giriş Yap' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('QA Ogrencisi').first()).toBeVisible();

  await page.goto(`${baseURL}/dashboard/gunluk-program`);
  await expect(page.getByRole('heading', { name: 'Günlük Program' })).toBeVisible();
  await expect(page.getByText('Paragraf QA')).toBeVisible();
  await page.screenshot({ path: path.join(qaDir, 'gunluk-program-desktop.png') });

  await page.getByRole('button', { name: 'Görev ekle' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Yeni görev' })).toBeVisible();
  await dialog.getByLabel('Ders').selectOption({ index: 1 });
  await dialog.getByLabel('Konu').fill('Playwright CRUD görevi');
  await dialog.getByLabel('Soru sayısı').fill('12');
  await dialog.getByRole('button', { name: 'Görevi ekle' }).click();
  await expect(page.getByText('Playwright CRUD görevi')).toBeVisible();

  const crudRow = page.getByText('Playwright CRUD görevi').locator('xpath=ancestor::article');
  await crudRow.getByRole('button', { name: 'Görevi düzenle' }).click();
  await dialog.getByLabel('Konu').fill('Playwright düzenlendi');
  await dialog.getByRole('button', { name: 'Değişiklikleri kaydet' }).click();
  await expect(page.getByText('Playwright düzenlendi')).toBeVisible();

  const editedRow = page.getByText('Playwright düzenlendi').locator('xpath=ancestor::article');
  await editedRow.getByRole('button', { name: 'Tamamla', exact: true }).click();
  await expect(editedRow.getByRole('button', { name: 'Tamamlandı' })).toBeVisible();
  page.once('dialog', (confirmation) => confirmation.accept());
  await editedRow.getByRole('button', { name: 'Görevi sil' }).click();
  await expect(page.getByText('Playwright düzenlendi')).toHaveCount(0);

  const routes = [
    ['haftalik-program', 'Haftalık Program'],
    ['konu-takibi', 'Konu Takibi'],
    ['deneme-analizi', 'Deneme Analizi'],
    ['tekrarlarim', 'Tekrarlarım'],
    ['yapamadiklari', 'Yapamadığım Sorular'],
    ['kaynaklarim', 'Kaynaklarım'],
    ['istatistikler', 'İstatistikler'],
    ['pomodoro', 'Pomodoro'],
    ['not-defteri', 'Not Defterim'],
    ['hedeflerim', 'Hedeflerim'],
    ['ayarlar', 'Ayarlar'],
  ];

  for (const [slug, heading] of routes) {
    await page.goto(`${baseURL}/dashboard/${slug}`);
    await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(qaDir, `${slug}-desktop.png`) });
  }

  await page.goto(`${baseURL}/dashboard/pomodoro`);
  const startButton = page.getByRole('button', { name: /Başla/ }).first();
  await startButton.click();
  await expect(page.getByRole('button', { name: /Duraklat/ }).first()).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseURL}/dashboard/gunluk-program`);
  await expect(page.getByRole('heading', { name: 'Günlük Program' })).toBeVisible();
  await page.screenshot({ path: path.join(qaDir, 'gunluk-program-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Menüyü aç' }).click();
  await expect(page.getByRole('navigation', { name: 'Ana menü' })).toBeVisible();
  await page.screenshot({ path: path.join(qaDir, 'mobile-navigation-open.png') });

  expect(browserErrors).toEqual([]);
});
