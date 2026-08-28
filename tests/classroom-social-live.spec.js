const { test, expect } = require('@playwright/test');

const email = process.env.CALISIYO_TEST_EMAIL;
const password = process.env.CALISIYO_TEST_PASSWORD;

test.describe('Authenticated classroom social UI', () => {
  test.skip(!email || !password, 'Dedicated test account is required.');

  test('friends discovery and ranking fit a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/giris');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('.auth-submit').click();
    await page.waitForURL(/\/dashboard(?:\/|$)/, { timeout: 30000 });
    await page.goto('/dashboard/arkadaslar');
    await expect(page.locator('.social-connect-bar')).toBeVisible();
    await expect(page.locator('.leaderboard-list article.is-self')).toBeVisible();
    await expect(page.getByPlaceholder('Kullanıcı adıyla arkadaş bul')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('classroom response allows same-origin microphone requests', async ({ page }) => {
    const response = await page.goto('/dashboard/arkadaslar');
    expect(response.headers()['permissions-policy']).toContain('microphone=(self)');
  });
});
