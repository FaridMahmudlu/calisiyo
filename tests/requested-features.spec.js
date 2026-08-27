const { test, expect } = require('@playwright/test');

const email = process.env.QA_EMAIL;
const password = process.env.QA_PASSWORD;

async function login(page) {
  await page.goto('/giris');
  await page.getByLabel('E-posta').fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole('button', { name: 'Giriş Yap' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test.describe('requested study feature regressions', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!email || !password, 'QA credentials are required.');
    await login(page);
  });

  test('does not guess an unannounced YKS date and exposes the motivational goal editor', async ({ page }) => {
    await expect(page.getByText(/Resmî tarih ÖSYM tarafından henüz açıklanmadı/)).toBeVisible();
    await page.goto('/dashboard/hedeflerim');
    await page.getByRole('button', { name: 'Hedefleri düzenle' }).click();
    const dialog = page.getByRole('dialog', { name: 'Hedefleri düzenle' });
    await expect(dialog.getByText('Hedef üniversite')).toBeVisible();
    await expect(dialog.getByText('Hedef bölüm')).toBeVisible();
    const fileInput = dialog.locator('input[type="file"]');
    await expect(fileInput).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
  });

  test('supports bulk questions and multiple images', async ({ page }) => {
    await page.goto('/dashboard/yapamadiklari');
    await page.getByRole('button', { name: 'Toplu ekle' }).click();
    const bulkDialog = page.getByRole('dialog', { name: 'Soruları görsellerle toplu ekle' });
    await expect(bulkDialog).toBeVisible();
    await expect(bulkDialog.locator('input[type="file"]')).toHaveAttribute('multiple', '');
    await expect(bulkDialog.locator('textarea')).toHaveCount(0);
    await page.getByRole('button', { name: 'İptal' }).click();
    await page.getByRole('button', { name: 'Soru ekle' }).click();
    await expect(page.getByRole('dialog').locator('input[type="file"]')).toHaveAttribute('multiple', '');
  });

  test('geometry is available and topic status changes without a full-page loader', async ({ page }) => {
    await page.goto('/dashboard/konu-takibi');
    await page.getByPlaceholder('Konu ara').fill('Geometri');
    const course = page.locator('.ders-summary').first();
    await expect(course).toBeVisible();
    await course.click();
    const status = page.locator('.status-btn').first();
    await expect(status).toBeVisible();
    const original = await status.getAttribute('aria-label');
    for (let index = 0; index < 3; index += 1) {
      await status.click();
      await expect(status).toHaveAttribute('aria-busy', 'false');
      await expect(page.getByText('Konu ilerlemen hazırlanıyor')).toHaveCount(0);
    }
    await expect(status).toHaveAttribute('aria-label', original);
  });

  test('shows canonical study statistics without a separate focus metric and exposes username classrooms', async ({ page }) => {
    await page.goto('/dashboard/istatistikler');
    await expect(page.getByText('Çalışma süresi', { exact: true })).toBeVisible();
    await expect(page.getByText('Odak süresi', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Seçili dönemde program uyumu', { exact: true })).toBeVisible();
    await expect(page.getByText('Sonradan çözülen soru', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Tümü' }).click();
    await expect(page.locator('.global-error')).toHaveCount(0);

    await page.goto('/dashboard/arkadaslar');
    await expect(page.getByLabel('Kullanıcı adı')).toBeVisible();
    await expect(page.getByText('Kullanıcı adıyla arkadaş bul')).toBeVisible();
    await expect(page.getByText('Herkese açık sınıflar')).toBeVisible();
  });

  test('new feature surfaces remain usable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ['/dashboard/hedeflerim', '/dashboard/yapamadiklari', '/dashboard/istatistikler', '/dashboard/arkadaslar']) {
      await page.goto(path);
      await expect(page.locator('main')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    }
  });

  test('mobile searchable Select opens without forcing the keyboard', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard/gunluk-program');
    await page.getByRole('button', { name: 'Görev ekle' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Ders' }).click();
    await expect(dialog.locator('.study-select-popover')).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).not.toBe('INPUT');
    const search = dialog.locator('.study-select-search input');
    if (await search.count()) {
      await search.tap();
      await expect(search).toBeFocused();
    }
    await page.keyboard.press('Escape');
    await expect(dialog.locator('.study-select-popover')).toBeHidden();
  });
});
