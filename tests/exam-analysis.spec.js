const { test, expect } = require('@playwright/test');

// Requires a disposable QA account: QA_EMAIL and QA_PASSWORD.
test.describe('Multi-exam deneme analizi', () => {
  test.skip(!process.env.QA_EMAIL || !process.env.QA_PASSWORD, 'QA_EMAIL and QA_PASSWORD are required');

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('calisiyo-cookie-consent-v1', 'rejected'));
    await page.goto('/giris');
    await page.getByLabel('E-posta').fill(process.env.QA_EMAIL);
    await page.locator('input[autocomplete="current-password"]').fill(process.env.QA_PASSWORD);
    await page.getByRole('button', { name: 'Giriş Yap' }).click();
    await page.waitForURL(/\/dashboard/, { waitUntil: 'commit' });
  });

  test('records a KDS exam with an editable layout and analyses it separately', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    const title = `QA KDS ${Date.now()}`;

    await page.goto('/dashboard/deneme-analizi');
    await expect(page.getByRole('heading', { name: 'Deneme Analizi' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Sınav türleri' })).toBeVisible();

    await page.getByRole('button', { name: 'Başka sınav' }).click();
    const modal = page.locator('.modal');
    await modal.getByRole('button', { name: /^KDS/ }).click();
    await modal.getByLabel(/Yayın veya okul/).fill('QA okul sınavı');
    await modal.getByLabel(/Deneme adı/).fill(title);
    await modal.getByLabel('Türk Dili ve Edebiyatı doğru').fill('22');
    await modal.getByLabel('Türk Dili ve Edebiyatı yanlış').fill('4');
    await expect(modal.locator('.exam-entry-summary')).toContainText('21');

    await modal.getByLabel('Matematik doğru').fill('40');
    await expect(modal.getByText(/30 soruyu aşamaz/)).toBeVisible();
    await modal.getByLabel('Matematik doğru').fill('18');
    await modal.getByLabel('Matematik yanlış').fill('8');
    await modal.getByRole('button', { name: 'Denemeyi kaydet' }).click();

    await expect(page.locator('.exam-notice')).toContainText('KDS sonucun kaydedildi');
    await expect(page.getByRole('button', { name: /^KDS/ }).first()).toHaveAttribute('aria-current', 'page');
    const card = page.locator('.exam-card', { hasText: title });
    await expect(card).toContainText('37');
    await expect(page.getByRole('heading', { name: 'Ders bazında performans' })).toBeVisible();

    await page.getByRole('button', { name: /Genel bakış/ }).click();
    await expect(page.locator('.exam-type-card', { hasText: 'KDS' })).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /^KDS/ }).first().click();
    await page.locator('.exam-card', { hasText: title }).getByRole('button', { name: 'Sil' }).click();
    await expect(page.locator('.exam-card', { hasText: title })).toHaveCount(0);
    expect(consoleErrors).toEqual([]);
  });
});
