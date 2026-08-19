import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { DealsPage } from '../../pages/Deals/DealsPage';
import { MarketLeasingPage } from '../../pages/MarketLeasing/MarketLeasingPage';

const DEAL_NAME = 'Elm Street Plaza';
const AUTH_STATE = 'utils/googleAuthState.json';

const EXPECTED_PROFILES = ['Default', 'Small <1K', 'Med 1K-2K', 'LG 2K+', 'LG 2K+ No Renew', 'Back Retail'];
const LARGE_PROFILE = 'LG 2K+';
const LARGE_PROFILE_SUB_LABEL = '3 · 6,902 SF';
const RENEWAL_PROBABILITY = '60';

test.describe('Market Leasing', () => {
  test.skip(!fs.existsSync(AUTH_STATE), 'No stored authenticated session (utils/googleAuthState.json)');
  test.use({ storageState: AUTH_STATE });

  test.beforeEach(async ({ page }) => {
    const dealsPage = new DealsPage(page);
    await dealsPage.goto();
    await dealsPage.openDeal(DEAL_NAME);
    await new MarketLeasingPage(page).gotoFromTabBar();
  });

  test('TC-CUJ-10 - Market Leasing Assumptions renders all expected leasing profile columns', async ({ page }) => {
    const marketLeasingPage = new MarketLeasingPage(page);

    await expect(marketLeasingPage.heading()).toBeVisible();
    await expect(marketLeasingPage.heading()).toHaveText('Market Leasing Assumptions');

    for (const profile of EXPECTED_PROFILES) {
      await expect(marketLeasingPage.profileHeader(profile)).toBeVisible();
      await expect(marketLeasingPage.profileName(profile)).toHaveText(profile);
    }

    // The six sample profiles are the leftmost columns, in the order the test case lists them.
    // Profiles created by TC-CUJ-11 are appended to the right and are ignored here.
    const profileNames = await marketLeasingPage.profileNames();
    expect(profileNames.slice(0, EXPECTED_PROFILES.length)).toEqual(EXPECTED_PROFILES);

    await expect(marketLeasingPage.profileSubLabel(LARGE_PROFILE)).toHaveText(LARGE_PROFILE_SUB_LABEL);
  });

  test('TC-CUJ-11 - New leasing profile is created and its renewal probability persists across reload', async ({
    page,
  }) => {
    const marketLeasingPage = new MarketLeasingPage(page);

    await expect(marketLeasingPage.heading()).toBeVisible();

    const profilesBefore = await marketLeasingPage.profileNames();
    const newProfile = await marketLeasingPage.createProfile();

    // The app auto-numbers repeat creations, so accept `New profile` or `New profile <n>`.
    expect(newProfile).toMatch(/^New profile( \d+)?$/);

    const profilesAfter = await marketLeasingPage.profileNames();
    expect(profilesAfter).toEqual([...profilesBefore, newProfile]);

    await expect(marketLeasingPage.profileName(newProfile)).toHaveText(newProfile);
    await expect(marketLeasingPage.profileSubLabel(newProfile)).toHaveText('0 tenants');

    await marketLeasingPage.setRenewalProbability(newProfile, RENEWAL_PROBABILITY);
    await expect(marketLeasingPage.renewalProbabilityCell(newProfile)).toHaveText(`${RENEWAL_PROBABILITY}%`);

    await marketLeasingPage.reload();

    await expect(marketLeasingPage.profileHeader(newProfile)).toBeVisible();
    await expect(marketLeasingPage.profileName(newProfile)).toHaveText(newProfile);
    await expect(marketLeasingPage.renewalProbabilityCell(newProfile)).toHaveText(`${RENEWAL_PROBABILITY}%`);
  });
});
