import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

test('uses the rounded Nunito Sans typography system globally', () => {
  const layout = fs.readFileSync(path.join(root, 'app/layout.js'), 'utf8');
  const globals = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8');

  expect(layout).toContain('Nunito_Sans');
  expect(layout).toContain("variable: '--font-nunito-sans'");
  expect(layout).toContain('<html lang="tr" className={`${nunitoSans.variable} ${jetBrainsMono.variable}`}>');
  expect(globals).toContain("--font-sans: var(--font-nunito-sans, 'Avenir Next')");
  expect(globals).toContain('font-family: var(--font-sans)');
  expect(globals).toContain('font-optical-sizing: auto');
  expect(fs.readFileSync(path.join(root, 'app/dashboard/arkadaslar/classroom.css'), 'utf8'))
    .not.toContain('font-family: ui-serif');
});

for (const viewport of [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
]) {
  test(`renders readable typography without horizontal overflow on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);

    const typography = await page.locator('body').evaluate((body) => {
      const family = getComputedStyle(body).fontFamily.toLowerCase();
      const inheritedFamilies = [...document.querySelectorAll('h1, h2, p, a, button')]
        .slice(0, 20)
        .map((element) => getComputedStyle(element).fontFamily.toLowerCase());

      return { family, inheritedFamilies };
    });

    expect(typography.family).toContain('nunito');
    expect(typography.inheritedFamilies.every((family) => family.includes('nunito'))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
}
