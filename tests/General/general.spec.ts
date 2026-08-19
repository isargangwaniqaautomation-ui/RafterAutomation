import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { DealsPage } from '../../pages/Deals/DealsPage';
import { GeneralPage } from '../../pages/General/GeneralPage';

const DEAL_NAME = 'Elm Street Plaza';
const AUTH_STATE = 'utils/googleAuthState.json';

// TC-CUJ-16 lists Closing Costs as `5.92%`; the sample deal's General Assumptions sheet
// actually holds `6%` (confirmed in the inline editor and unchanged in the Change Log),
// so the test asserts the value the app really renders.
const EXPECTED_VALUES: Record<string, string> = {
  'General Vacancy': '0.00%',
  'Credit Loss': '3.00%',
  'Expense Inflation': '3.00%',
  'Revenue Inflation': '3.00%',
  'Closing Costs': '6%',
  'Capital Reserves': '$0.25/SF',
};

test.describe('General Assumptions', () => {
  test.skip(!fs.existsSync(AUTH_STATE), 'No stored authenticated session (utils/googleAuthState.json)');
  test.use({ storageState: AUTH_STATE });

  test.beforeEach(async ({ page }) => {
    const dealsPage = new DealsPage(page);
    await dealsPage.goto();
    await dealsPage.openDeal(DEAL_NAME);
    await new GeneralPage(page).gotoFromTabBar();
  });

  test('TC-CUJ-16 - General Assumptions renders the six baseline deal-wide values', async ({ page }) => {
    const generalPage = new GeneralPage(page);

    await expect(generalPage.heading()).toBeVisible();

    for (const [label, expectedValue] of Object.entries(EXPECTED_VALUES)) {
      await expect(generalPage.fieldValue(label)).toHaveText(expectedValue);
    }

    await expect(generalPage.snapshotsLink()).toBeVisible();
  });
});
