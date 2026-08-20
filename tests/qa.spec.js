const { test, expect } = require('@playwright/test');
const path = require('path');

const baseURL = process.env.BASE_URL || 'http://localhost:3000';
const qaDir = path.resolve(__dirname, '..', 'design-references', 'qa');

test('public auth, protected navigation, daily CRUD and responsive visuals', async ({ page }) => {
  test.setTimeout(480000);
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    const isLocalGoogleOriginWarning = message.text().includes('[GSI_LOGGER]: The given origin is not allowed');
    if (message.type() === 'error' && !message.text().includes('Failed to load resource') && !isLocalGoogleOriginWarning) {
      browserErrors.push(`console: ${message.text()}`);
    }
  });
  page.on('response', (response) => {
    const isLocalGoogleButton = response.url().startsWith('https://accounts.google.com/gsi/button');
    if (response.status() >= 400 && !isLocalGoogleButton) browserErrors.push(`response ${response.status()}: ${response.url()}`);
  });

  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.goto(baseURL);
  await expect(page.getByRole('heading', { name: /YKS hazırlığını tek bir net düzende yönet/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tek bir kayıt, bütün çalışma akışını günceller.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Rakamların yalnızca sen çalıştıkça oluşur.' })).toBeVisible();
  const landingHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < landingHeight; y += 700) {
    await page.evaluate((nextY) => window.scrollTo(0, nextY), y);
    await page.waitForTimeout(80);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(qaDir, 'landing-story-desktop.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByRole('heading', { name: /YKS hazırlığını tek bir net düzende yönet/ })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: path.join(qaDir, 'landing-story-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1024 });

  await page.goto(`${baseURL}/giris`);
  await expect(page.getByRole('heading', { name: 'Tekrar hoş geldin' })).toBeVisible();
  const googleButton = page.locator('.social-auth-button, .google-identity-button').first();
  await expect(googleButton).toBeVisible();
  await expect(page.getByRole('button', { name: /Apple ile devam et/ })).toHaveCount(0);
  await expect(page.getByText('Yakında')).toHaveCount(0);
  await page.goto(`${baseURL}/giris`);
  await page.screenshot({ path: path.join(qaDir, 'giris-desktop.png') });

  if (!process.env.SIGNUP_EMAIL || !process.env.QA_EMAIL || !process.env.QA_PASSWORD) {
    expect(browserErrors).toEqual([]);
    return;
  }

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
  await expect(page.locator('.global-error')).toHaveCount(0);

  const notificationButton = page.getByRole('button', { name: /bildirim/i }).first();
  await notificationButton.click();
  await expect(page.getByRole('region', { name: 'Bildirimler' })).toBeVisible();
  await expect(page.getByText('Bildirim merkezi hazır')).toBeVisible();
  await page.getByRole('button', { name: 'Tüm bildirimleri okundu işaretle' }).click();
  await notificationButton.click();

  await page.getByRole('button', { name: 'Profil menüsü' }).click();
  await expect(page.getByRole('region', { name: 'Profil menüsü' })).toBeVisible();
  await expect(page.getByText('Profil ve ayarlar')).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Seri kuralını açıkla' }).click();
  await expect(page.getByText('Seri nasıl ilerler?')).toBeVisible();

  const sidebar = page.locator('.study-sidebar');
  const resizer = page.getByRole('separator', { name: 'Panel genişliyini dəyiş' });
  const initialSidebarWidth = await sidebar.evaluate((element) => element.getBoundingClientRect().width);
  const resizerBox = await resizer.boundingBox();
  await page.mouse.move(resizerBox.x + 2, resizerBox.y + 120);
  await page.mouse.down();
  await page.mouse.move(resizerBox.x + 42, resizerBox.y + 120, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => sidebar.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(initialSidebarWidth);
  await page.getByRole('button', { name: 'Paneli daralt' }).click();
  await expect.poll(() => sidebar.evaluate((element) => element.getBoundingClientRect().width)).toBeLessThanOrEqual(80);
  await page.getByRole('button', { name: 'Paneli genişlet' }).click();

  await page.goto(`${baseURL}/dashboard/gunluk-program`);
  await expect(page.getByRole('heading', { name: 'Günlük Program' })).toBeVisible();
  await expect(page.getByText('Paragraf QA')).toBeVisible();
  await page.screenshot({ path: path.join(qaDir, 'gunluk-program-desktop.png') });

  await page.getByRole('button', { name: 'Görev ekle' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Yeni görev' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Ders' }).click();
  await dialog.getByRole('option').first().click();
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
    ['pomodoro', 'Kronometre'],
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

  await page.context().grantPermissions(['notifications'], { origin: baseURL });
  await page.goto(`${baseURL}/dashboard/ayarlar`);
  const notificationToggle = page.getByText('Bildirim merkezi').locator('xpath=ancestor::label').getByRole('checkbox');
  await expect(notificationToggle).toBeChecked();
  await notificationToggle.uncheck();
  await notificationToggle.check();
  const nameInput = page.getByLabel('Ad Soyad');
  await nameInput.fill('QA Ogrencisi Güncel');
  await page.getByRole('button', { name: 'Değişiklikleri kaydet' }).click();
  await expect(page.locator('.save-indicator.is-visible')).toContainText('Kaydedildi');
  await expect(page.locator('.global-error')).toHaveCount(0);

  await page.goto(`${baseURL}/dashboard/hedeflerim`);
  await page.getByRole('button', { name: 'Hedefleri düzenle' }).click();
  const goalDialog = page.getByRole('dialog');
  await goalDialog.getByLabel('TYT net hedefi').fill('75');
  await goalDialog.getByRole('button', { name: 'Kaydet', exact: true }).click();
  await expect(goalDialog).toBeHidden();
  await expect(page.locator('.global-error')).toHaveCount(0);

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
  await expect(page.locator('.sidebar-mobile-close')).toHaveCount(0);
  await page.screenshot({ path: path.join(qaDir, 'mobile-navigation-open.png') });

  expect(browserErrors).toEqual([]);
});

test('an authenticated account with a missing profile repairs itself and loads', async ({ page }) => {
  test.skip(!process.env.REPAIR_EMAIL || !process.env.QA_PASSWORD, 'Profile-repair credentials are required.');
  await page.goto(`${baseURL}/giris`);
  await page.getByLabel('E-posta').fill(process.env.REPAIR_EMAIL);
  await page.locator('input[autocomplete="current-password"]').fill(process.env.QA_PASSWORD);
  await page.getByRole('button', { name: 'Giriş Yap' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Onarim QA Ogrencisi').first()).toBeVisible();
  await expect(page.locator('.global-error')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /Merhaba/ })).toBeVisible();
});
