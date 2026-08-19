import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { DealsPage } from '../../pages/Deals/DealsPage';
import { DashboardPage } from '../../pages/Dashboard/DashboardPage';

const DEAL_NAME = 'Elm Street Plaza';
const AUTH_STATE = 'utils/googleAuthState.json';
const PERCENT_OR_MULTIPLE = /^-?\d+(\.\d+)?(%|x)$/;

test.describe('Dashboard', () => {
  test.skip(!fs.existsSync(AUTH_STATE), 'No stored authenticated session (utils/googleAuthState.json)');
  test.use({ storageState: AUTH_STATE });

  test('TC-CUJ-03 - Dashboard return tiles render correctly formatted, non-empty values', async ({ page }) => {
    const dealsPage = new DealsPage(page);
    await dealsPage.goto();
    await dealsPage.openDeal(DEAL_NAME);

    const dashboardPage = new DashboardPage(page);
    const tiles = dashboardPage.returnTiles();

    const expected: Record<string, string> = {
      leveredIrr: '5.38%',
      equityMultiple: '1.60x',
      unleveredIrr: '6.17%',
      cashOnCash: '3.06%',
    };

    for (const [key, locator] of Object.entries(tiles)) {
      const text = (await locator.textContent())?.trim() ?? '';
      expect(text, `${key} should not be blank`).not.toBe('');
      expect(text, `${key} should not be a dash`).not.toBe('—');
      expect(text, `${key} should match a percentage or multiple format`).toMatch(PERCENT_OR_MULTIPLE);
      expect(text, `${key} should match the current sample-deal baseline`).toBe(expected[key]);
    }
  });
});
