const { defineConfig } = require('@playwright/test');

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
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
