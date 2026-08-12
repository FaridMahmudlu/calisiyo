const { defineConfig } = require('@playwright/test');
const port = Number(process.env.PLAYWRIGHT_PORT || 3000);
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${port}`;

module.exports = defineConfig({
  testDir: './tests',
  testMatch: '*.spec.js',
  respectGitIgnore: false,
  fullyParallel: false,
  workers: 1,
  reporter: 'line',
  timeout: 240000,
  outputDir: './tmp/playwright-results',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER === '1'
    ? undefined
    : {
        command: `npm run start -- -p ${port}`,
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120000,
      },
});
