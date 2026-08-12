const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const email = process.env.QA_EMAIL;
const password = process.env.QA_PASSWORD;
const expectAdmin = process.env.QA_ADMIN === '1';
const captureDir = process.env.QA_CAPTURE_DIR;

async function capture(page, name) {
  if (!captureDir) return;
  fs.mkdirSync(captureDir, { recursive: true });
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(captureDir, `${name}.png`), fullPage: true });
}

async function login(page) {
  await page.goto('/giris');
  await page.getByLabel('E-posta').fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.locator('.auth-submit').click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test.describe('XP, social classroom and admin platform features', () => {
  test.skip(!email || !password, 'QA credentials are required.');

  test('student progression and social hub are real, interactive and responsive', async ({ page }) => {
    const failed = [];
    const errors = [];
    page.on('response', (response) => { if (response.status() >= 500) failed.push(`${response.status()} ${response.url()}`); });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.setViewportSize({ width: 1440, height: 1000 });
    await login(page);

    await page.goto('/dashboard/gelisim');
    await expect(page.locator('.progression-hero')).toBeVisible();
    await expect(page.locator('.level-orbit strong')).toContainText(/\d+/);
    await expect(page.getByText('XP kuralları')).toBeVisible();
    await expect(page.locator('.global-error')).toHaveCount(0);
    await capture(page, 'progression-desktop');

    await page.goto('/dashboard/arkadaslar');
    await expect(page.locator('.friend-code-card')).toContainText(/CAL-[A-Z0-9]{10}/);
    await expect(page.getByText('Neyi paylaşacağını sen seç')).toBeVisible();
    await expect(page.getByText('Deneme netleri hiçbir zaman sosyal profiline eklenmez.')).toBeVisible();
    await capture(page, 'social-hub-desktop');

    const roomName = `Playwright Sınıfı ${Date.now()}`;
    await page.getByRole('button', { name: 'Sınıf oluştur', exact: true }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Sınıf adı').fill(roomName);
    await dialog.getByLabel('Haftalık ortak hedef (dakika)').fill('300');
    await dialog.getByRole('button', { name: 'Sınıfı oluştur' }).click();
    await expect(page).toHaveURL(/\/dashboard\/arkadaslar\/[0-9a-f-]+$/);
    await expect(page.getByRole('heading', { name: roomName })).toBeVisible();
    await expect(page.locator('.isometric-classroom')).toBeVisible();
    await page.getByRole('button', { name: 'Çalışıyor' }).click();
    await page.getByLabel('Şu an ne çalışıyorsun?').fill('TYT Matematik · Problemler');
    await page.getByRole('button', { name: 'Durumumu güncelle' }).click();
    await expect(page.locator('.classroom-seat.is-me')).toHaveClass(/is-studying/);
    await expect(page.getByText('TYT Matematik · Problemler')).toBeVisible();
    await capture(page, 'classroom-desktop');
    await page.getByRole('button', { name: 'Sınıfı kapat' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Sınıfı kapat' }).click();
    await expect(page).toHaveURL(/\/dashboard\/arkadaslar$/);

    await page.setViewportSize({ width: 390, height: 844 });
    for (const [route, name, readySelector] of [
      ['/dashboard/gelisim', 'progression-mobile', '.progression-hero'],
      ['/dashboard/arkadaslar', 'social-hub-mobile', '.friend-code-card'],
    ]) {
      await page.goto(route);
      await expect(page.locator(readySelector)).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expect(page.locator('.global-error')).toHaveCount(0);
      await capture(page, name);
    }

    expect(failed).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('admin area enforces role and renders responsive real analytics', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await login(page);
    await page.goto('/admin');

    if (!expectAdmin) {
      await expect(page).toHaveURL(/\/dashboard$/);
      return;
    }

    await expect(page.getByRole('heading', { name: 'calisiyo’nun nabzı' })).toBeVisible();
    await expect(page.getByText('Toplam kullanıcı')).toBeVisible();
    await expect(page.getByText('Kullanıcı yönetimi')).toBeVisible();
    await expect(page.locator('.admin-users tbody tr').first()).toBeVisible();
    await capture(page, 'admin-desktop');
    await page.locator('.admin-users tbody tr').first().getByRole('button', { name: 'Yönet' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Pencereyi kapat' }).click();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page.getByRole('heading', { name: 'calisiyo’nun nabzı' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Menüyü aç' }).click();
    const mobileNavigation = page.getByRole('navigation', { name: 'Admin menüsü' });
    await expect(mobileNavigation).toBeVisible();
    await expect.poll(async () => {
      const box = await mobileNavigation.locator('xpath=ancestor::aside').boundingBox();
      return Math.abs(box?.x ?? -999) < 1;
    }).toBe(true);
    const sidebarBox = await mobileNavigation.locator('xpath=ancestor::aside').boundingBox();
    expect(sidebarBox.width).toBeGreaterThanOrEqual(220);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await capture(page, 'admin-mobile');
  });
});
