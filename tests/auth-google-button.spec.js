const { test, expect } = require('@playwright/test');

test.describe('Google Login Button Consistency', () => {
  const pages = ['/giris', '/kayit'];

  for (const pagePath of pages) {
    test(`Google button is always present on ${pagePath} across repeated reloads`, async ({ page }) => {
      for (let i = 0; i < 5; i++) {
        await page.goto(pagePath, { waitUntil: 'domcontentloaded' });
        
        // Assert the social-auth container exists
        const socialAuth = page.locator('.social-auth');
        await expect(socialAuth).toBeVisible();

        const googleBtn = page.getByRole('button', { name: 'Google ile devam et' });
        await expect(googleBtn).toBeVisible({ timeout: 5000 });
        await expect(page.locator('.google-identity-button')).toHaveCount(0);
        await expect(page.locator('.social-auth-button-arrow')).toHaveCount(0);

        const footprint = await socialAuth.evaluate((container) => {
          const containerBox = container.getBoundingClientRect();
          const target = [...container.querySelectorAll('.social-auth-button')]
            .find((element) => {
              const box = element.getBoundingClientRect();
              const style = window.getComputedStyle(element);
              return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
            });

          if (!target) return null;
          const buttonBox = target.getBoundingClientRect();
          return { containerWidth: containerBox.width, width: buttonBox.width, height: buttonBox.height };
        });
        expect(footprint).not.toBeNull();
        expect(footprint.width).toBeGreaterThanOrEqual(footprint.containerWidth - 2);
        expect(footprint.height).toBeGreaterThanOrEqual(54);
      }
    });
  }
});
