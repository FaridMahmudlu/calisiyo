const { test, expect } = require('@playwright/test');
const path = require('path');

const baseURL = process.env.BASE_URL || 'http://localhost:3000';
const email = process.env.QA_EMAIL;
const password = process.env.QA_PASSWORD;
const expectedName = process.env.QA_NAME || 'Emir Kaya';
const evidenceDir = path.resolve(__dirname, '..', 'design-references', 'qa-audit-2026-08-12');

async function login(page) {
  await page.goto(`${baseURL}/giris`);
  await page.getByLabel('E-posta').fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole('button', { name: 'Giriş Yap' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText(expectedName).first()).toBeVisible();
  await expect(page.locator('.global-error')).toHaveCount(0);
}

test.describe('Calisiyo production-grade QA journey', () => {
  test.skip(!email || !password, 'QA_EMAIL and QA_PASSWORD are required.');

  test('auth validation, Google handoff, protected routes, persistence and logout', async ({ browser }) => {
    const anonymous = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await anonymous.newPage();

    await page.goto(`${baseURL}/dashboard`);
    await expect(page).toHaveURL(/\/giris$/);
    await expect(page.getByRole('heading', { name: 'Tekrar hoş geldin' })).toBeVisible();

    await page.getByRole('button', { name: 'Giriş Yap' }).click();
    const emailInput = page.getByLabel('E-posta');
    await expect(emailInput).toBeFocused();
    await emailInput.fill('gecersiz-adres');
    await page.locator('input[autocomplete="current-password"]').fill('Yanlis!12345');
    await page.getByRole('button', { name: 'Giriş Yap' }).click();
    expect(await emailInput.evaluate((input) => input.validity.typeMismatch)).toBe(true);

    await emailInput.fill(email);
    await page.getByRole('button', { name: 'Giriş Yap' }).click();
    await expect(page.locator('.auth-alert')).toContainText('E-posta veya şifre hatalı');
    await page.screenshot({ path: path.join(evidenceDir, '01-login-validation.png') });

    const oauthContext = await browser.newContext();
    await oauthContext.route('https://accounts.google.com/gsi/client', (route) => route.abort());
    const oauthPage = await oauthContext.newPage();
    await oauthPage.goto(`${baseURL}/giris`);
    await oauthPage.getByRole('button', { name: 'Google ile devam et' }).click();
    await oauthPage.waitForURL(/accounts\.google\.com/, { timeout: 20000 });
    expect(oauthPage.url()).toContain('client_id=');
    await oauthContext.close();

    await login(page);
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText(expectedName).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: new RegExp(`Merhaba ${expectedName.split(' ')[0]}`) })).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, '02-dashboard-authenticated.png'), fullPage: true });

    const cookies = await anonymous.cookies();
    expect(cookies.some((cookie) => cookie.name.includes('-auth-token'))).toBe(true);
    const persistedState = await anonymous.storageState();
    const restarted = await browser.newContext({ storageState: persistedState });
    const restartedPage = await restarted.newPage();
    await restartedPage.goto(`${baseURL}/dashboard`);
    await expect(restartedPage).toHaveURL(/\/dashboard$/);
    await expect(restartedPage.getByText(expectedName).first()).toBeVisible();
    await restarted.close();

    await page.getByRole('button', { name: 'Profil menüsü' }).click();
    await expect(page.getByRole('region', { name: 'Profil menüsü' })).toBeVisible();
    await page.getByRole('button', { name: 'Güvenli çıkış yap' }).click();
    await expect(page).toHaveURL(/\/giris$/);
    await page.goto(`${baseURL}/dashboard/istatistikler`);
    await expect(page).toHaveURL(/\/giris$/);
    const afterLogoutCookies = await anonymous.cookies();
    expect(afterLogoutCookies.filter((cookie) => cookie.name.includes('-auth-token')).every((cookie) => !cookie.value)).toBe(true);
    await anonymous.close();
  });

  test('registration gives consistent weak-password and duplicate-account feedback', async ({ page }) => {
    await page.goto(`${baseURL}/kayit`);
    await page.getByLabel('Ad Soyad').fill('QA Kayıt Öğrencisi');
    await page.getByLabel('E-posta').fill(email);
    const passwords = page.locator('input[autocomplete="new-password"]');
    await passwords.nth(0).fill('abcdefghij');
    await passwords.nth(1).fill('abcdefghij');
    await page.locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: 'Devam Et' }).click();
    await expect(page.locator('.auth-alert')).toContainText('büyük ve bir küçük harf');

    await passwords.nth(0).fill(password);
    await passwords.nth(1).fill(password);
    await page.getByRole('button', { name: 'Devam Et' }).click();
    await page.getByRole('button', { name: /^Sayısal/ }).click();
    await page.getByRole('button', { name: 'Hesabı Oluştur' }).click();
    await expect(page.locator('.auth-alert')).toContainText('daha önce hesap oluşturulmuş');
    await expect(page).toHaveURL(/\/kayit$/);
  });

  test('planning CRUD stays in sync and rejects invalid or overlapping entries', async ({ page }) => {
    await login(page);
    await page.goto(`${baseURL}/dashboard/gunluk-program`);
    const topic = `QA Türkçe ${Date.now()}`;

    await page.getByRole('button', { name: 'Görev ekle' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Başlangıç').fill('22:40');
    await dialog.getByLabel('Bitiş').fill('22:20');
    await dialog.getByRole('button', { name: 'Ders' }).click();
    await dialog.getByRole('option').first().click();
    await dialog.getByLabel('Konu').fill(topic);
    await dialog.getByLabel('Soru sayısı').fill('12');
    await dialog.getByRole('button', { name: 'Görevi ekle' }).click();
    await expect(page.locator('.global-error')).toContainText('Bitiş saati başlangıç saatinden sonra');
    await dialog.getByLabel('Bitiş').fill('23:00');
    await dialog.getByRole('button', { name: 'Görevi ekle' }).click();
    await expect(page.getByText(topic)).toBeVisible();

    await page.goto(`${baseURL}/dashboard/haftalik-program`);
    await expect(page.getByText(topic)).toBeVisible();
    await page.goto(`${baseURL}/dashboard/gunluk-program`);
    const row = page.getByText(topic).locator('xpath=ancestor::article');
    await row.getByRole('button', { name: 'Görevi düzenle' }).click();
    await dialog.getByLabel('Konu').fill(`${topic} güncellendi`);
    await dialog.getByRole('button', { name: 'Değişiklikleri kaydet' }).click();
    await expect(page.getByText(`${topic} güncellendi`)).toBeVisible();
    await page.goto(`${baseURL}/dashboard/haftalik-program`);
    await expect(page.getByText(`${topic} güncellendi`)).toBeVisible();

    await page.goto(`${baseURL}/dashboard/gunluk-program`);
    const editedRow = page.getByText(`${topic} güncellendi`).locator('xpath=ancestor::article');
    await editedRow.getByRole('button', { name: 'Görevi tamamla' }).click();
    await expect(editedRow).toHaveClass(/is-complete/);
    page.once('dialog', (confirmation) => confirmation.accept());
    await editedRow.getByRole('button', { name: 'Görevi sil' }).click();
    await expect(page.getByText(`${topic} güncellendi`)).toHaveCount(0);
  });

  test('Kronometre survives refresh, tracks wall-clock time and records once', async ({ page }) => {
    await login(page);
    await page.goto(`${baseURL}/dashboard/pomodoro`);
    const workInput = page.getByLabel('Çalışma süresi (dk)');
    await workInput.fill('1');
    await page.getByLabel('Mola süresi (dk)').fill('1');
    await page.getByRole('button', { name: 'Özel süreyi uygula' }).click();
    await page.getByRole('button', { name: 'Başla' }).click();
    await expect(page.getByText(/00:5[6-9]/)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Duraklat' }).click();
    const paused = await page.locator('.timer-copy strong').innerText();
    await page.waitForTimeout(1300);
    await expect(page.locator('.timer-copy strong')).toHaveText(paused);
    await page.getByRole('button', { name: 'Devam et' }).click();

    await page.evaluate(() => {
      const key = Object.keys(localStorage).find((name) => name.startsWith('calisiyo-pomodoro-v1:'));
      const state = JSON.parse(localStorage.getItem(key));
      state.timeLeft = 1;
      state.deadline = Date.now() + 900;
      state.running = true;
      localStorage.setItem(key, JSON.stringify(state));
    });
    const before = await page.locator('.today-sessions > strong').first().innerText();
    await page.reload();
    await expect(page.getByText('Mola', { exact: true })).toBeVisible({ timeout: 8000 });
    await expect.poll(async () => Number(await page.locator('.today-sessions > strong').first().innerText())).toBe(Number(before) + 1);
    await page.reload();
    await expect(page.locator('.today-sessions > strong').first()).toHaveText(String(Number(before) + 1));
  });

  test('practice-exam math and goal propagation use the saved real records', async ({ page }) => {
    await login(page);
    await page.goto(`${baseURL}/dashboard/deneme-analizi`);
    const publication = `QA Deneme ${Date.now()}`;
    await page.getByRole('button', { name: 'Deneme ekle' }).click();
    const modal = page.locator('.modal');
    await modal.getByLabel('Yayın Adı').fill(publication);
    await modal.getByLabel('Süre (dk)').fill('-5');
    await modal.getByRole('button', { name: 'Kaydet' }).click();
    await expect(page.locator('.global-error')).toContainText('Deneme süresi 1 ile 600 dakika');
    await modal.getByLabel('Süre (dk)').fill('165');
    await modal.locator('input[aria-label$=" doğru"]').first().fill('30');
    await modal.locator('input[aria-label$=" yanlış"]').first().fill('4');
    await modal.locator('input[aria-label$=" boş"]').first().fill('6');
    await modal.getByRole('button', { name: 'Kaydet' }).click();
    const examCard = page.getByText(publication).locator('xpath=ancestor::*[contains(@class,"deneme-card")]');
    await expect(examCard).toContainText('29.00');

    await page.goto(`${baseURL}/dashboard/istatistikler`);
    await expect(page.getByText(publication)).toBeVisible();
    await page.goto(`${baseURL}/dashboard/deneme-analizi`);
    const savedCard = page.getByText(publication).locator('xpath=ancestor::*[contains(@class,"deneme-card")]');
    page.once('dialog', (confirmation) => confirmation.accept());
    await savedCard.getByRole('button', { name: 'Sil' }).click();
    await expect(page.getByText(publication)).toHaveCount(0);

    await page.goto(`${baseURL}/dashboard/hedeflerim`);
    await page.getByRole('button', { name: 'Hedefleri düzenle' }).click();
    const goalDialog = page.getByRole('dialog');
    await goalDialog.getByLabel('Haftalık soru hedefi').fill('721');
    await goalDialog.getByRole('button', { name: 'Kaydet' }).click();
    await expect(goalDialog).toBeHidden();
    await page.goto(`${baseURL}/dashboard/istatistikler`);
    await expect(page.locator('.stats-goal-card')).toContainText('/ 721');
    await page.goto(`${baseURL}/dashboard/hedeflerim`);
    await page.getByRole('button', { name: 'Hedefleri düzenle' }).click();
    await page.getByRole('dialog').getByLabel('Haftalık soru hedefi').fill('720');
    await page.getByRole('dialog').getByRole('button', { name: 'Kaydet' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('real statistics, header interactions and responsive routes remain usable', async ({ page }) => {
    const failedResponses = [];
    const pageErrors = [];
    page.on('response', (response) => {
      if (response.status() >= 500) failedResponses.push(`${response.status()} ${response.url()}`);
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await login(page);

    const notificationButton = page.getByRole('button', { name: /bildirim/i }).first();
    await notificationButton.click();
    await expect(page.getByRole('region', { name: 'Bildirimler' })).toBeVisible();
    const markAllRead = page.getByRole('button', { name: 'Tüm bildirimleri okundu işaretle' });
    if (await markAllRead.isEnabled()) await markAllRead.click();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Profil menüsü' }).click();
    await expect(page.getByText('Profil ve ayarlar')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.goto(`${baseURL}/dashboard/istatistikler`);
    await expect(page.getByRole('heading', { name: 'İstatistikler' })).toBeVisible();
    await expect(page.getByText('Canlı veri')).toBeVisible();
    await expect(page.getByText('Deneme geçmişi')).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, '03-statistics-desktop.png'), fullPage: true });

    const routes = [
      '/dashboard', '/dashboard/gunluk-program', '/dashboard/haftalik-program',
      '/dashboard/konu-takibi', '/dashboard/deneme-analizi', '/dashboard/tekrarlarim',
      '/dashboard/yapamadiklari', '/dashboard/kaynaklarim', '/dashboard/istatistikler',
      '/dashboard/pomodoro', '/dashboard/not-defteri', '/dashboard/hedeflerim',
      '/dashboard/ayarlar', '/dashboard/abonelik', '/dashboard/gelisim',
      '/dashboard/arkadaslar', '/dashboard/icerik-ureticisi',
    ];
    for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }]) {
      await page.setViewportSize(viewport);
      for (const route of routes) {
        await page.goto(`${baseURL}${route}`);
        await expect(page.locator('.journey-loader')).toHaveCount(0, { timeout: 20000 });
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
        await expect(page.locator('.global-error')).toHaveCount(0);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseURL}/dashboard/istatistikler`);
    await expect(page.getByRole('heading', { name: 'İstatistikler' })).toBeVisible();
    await expect(page.getByText('Canlı veri')).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, '04-statistics-mobile.png'), fullPage: true });
    expect(failedResponses).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
