const { test, expect } = require('@playwright/test');

test.describe('Google Login Button Consistency', () => {
  const pages = ['/giris', '/kayit'];

  for (const pagePath of pages) {
    test(`Google button is always present on ${pagePath} across repeated reloads`, async ({ page }) => {
      for (let i = 0; i < 5; i++) {
        await page.goto(`http://localhost:3000${pagePath}`, { waitUntil: 'domcontentloaded' });
        
        // Assert the social-auth container exists
        const socialAuth = page.locator('.social-auth');
        await expect(socialAuth).toBeVisible();

        // Assert that a button with "Google" text or google-identity-button is present and visible
        const googleBtn = page.locator('.social-auth-button, .google-identity-button');
        await expect(googleBtn.first()).toBeVisible({ timeout: 5000 });
      }
    });
  }
});
