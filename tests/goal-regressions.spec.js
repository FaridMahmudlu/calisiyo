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

test.describe('curriculum, streak, analysis and continuation regressions', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!email || !password, 'QA credentials are required.');
    await login(page);
  });

  test('streak explanation and curriculum selector work without changing saved data', async ({ page }) => {
    const streakButton = page.getByRole('button', { name: 'Seri kuralını açıkla' });
    await streakButton.click();
    await expect(page.getByRole('tooltip')).toContainText('en az 30 dakika');
    await page.locator('.study-main').click({ position: { x: 500, y: 200 } });
    await expect(streakButton).toHaveAttribute('aria-expanded', 'false');

    await page.goto('/dashboard/ayarlar');
    await expect(page.getByRole('heading', { name: 'YKS yılı ve müfredat' })).toBeVisible();
    await page.getByRole('button', { name: /YKS 2028/ }).click();
    await expect(page.getByRole('link', { name: 'Resmî MEB programını aç' })).toHaveAttribute('href', /tymm\.meb\.gov\.tr/);
  });

  test('exam form exposes clear D/Y/B/net columns and real official limits', async ({ page }) => {
    await page.goto('/dashboard/deneme-analizi');
    await page.getByRole('button', { name: 'Deneme ekle' }).click();
    const dialog = page.getByRole('dialog', { name: /Yeni TYT Denemesi/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Doğru', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Yanlış', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Boş', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Net', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Toplam 40 soru').first()).toBeVisible();
  });

  test('YouTube planner supports video and minute continuation', async ({ page }) => {
    await page.route('**/api/youtube/plan', async (route) => {
      const request = route.request();
      if (request.method() !== 'POST') return route.continue();
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        ok: true,
        resource: { kind: 'youtube_playlist', title: 'TYT Matematik Kampı', channelTitle: 'Örnek Kanal', itemCount: 12, durationMinutes: 480, thumbnailUrl: null },
        items: Array.from({ length: 12 }, (_, index) => ({ videoId: `abcdefghij${index % 10}`, title: `Ders ${index + 1}`, durationSeconds: 2400, position: index + 1 })),
      }) });
    });
    await page.goto('/dashboard/kaynaklarim');
    await page.getByRole('button', { name: /YouTube’dan planla/ }).click();
    await page.getByLabel('YouTube bağlantısı').fill('https://www.youtube.com/playlist?list=PLabcdefghij');
    await page.getByRole('button', { name: 'İçeriği analiz et' }).click();
    await expect(page.getByText('TYT Matematik Kampı')).toBeVisible();
    await expect(page.getByLabel('Devam edilecek video')).toBeVisible();
    await expect(page.getByLabel('Videodaki dakika')).toBeVisible();
  });

  test('billing stays at exactly two product cards', async ({ page }) => {
    await page.goto('/dashboard/abonelik');
    await expect(page.locator('.billing-plan-card')).toHaveCount(2);
    await expect(page.getByRole('heading', { level: 3, name: 'calisiyo ücretsiz' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'calisiyo plus' })).toBeVisible();
    await expect(page.getByText(/Şehit ve gazi yakınlarından/)).toBeVisible();
  });
});
