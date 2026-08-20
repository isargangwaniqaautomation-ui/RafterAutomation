import fs from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

if (fs.existsSync('.env')) {
  process.loadEnvFile('.env');
}

export default defineConfig({
  testDir: './tests',
  // Every spec drives the same live sample deal and eight of them edit it, so the suite has to
  // run one test at a time. In parallel, one test's edit lands inside another's baseline
  // assertion and its restore undoes an edit the other is still asserting on.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // A hook that navigates, opens the deal and switches sheet, against a remote model that
  // recalculates on every edit, does not fit in 30s.
  timeout: 90 * 1000,
  expect: { timeout: 15 * 1000 },
  reporter: [['html', { open: 'never' }]],

  use: {
    baseURL: 'https://app.raftercre.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 20 * 1000,
    navigationTimeout: 45 * 1000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
