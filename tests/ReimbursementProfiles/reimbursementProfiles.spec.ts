import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { DealsPage } from '../../pages/Deals/DealsPage';
import { RentRollPage } from '../../pages/RentRoll/RentRollPage';
import { ReimbursementProfilesPage } from '../../pages/ReimbursementProfiles/ReimbursementProfilesPage';

const DEAL_NAME = 'Elm Street Plaza';
const AUTH_STATE = 'utils/googleAuthState.json';

const NNN_PROFILE = 'NNN';
const EXPECTED_NNN_TENANTS = 13;

const EXPECTED_TYPE_OPTIONS = ['Single net', 'Double net', 'Triple net', 'Base year', 'Gross', 'Gross + electric'];
const NEW_PROFILE_TYPE = 'Double net';

test.describe('Reimbursement Profiles', () => {
  test.skip(!fs.existsSync(AUTH_STATE), 'No stored authenticated session (utils/googleAuthState.json)');
  test.use({ storageState: AUTH_STATE });

  test.beforeEach(async ({ page }) => {
    const dealsPage = new DealsPage(page);
    await dealsPage.goto();
    await dealsPage.openDeal(DEAL_NAME);
    await new ReimbursementProfilesPage(page).gotoFromTabBar();
  });

  test('TC-CUJ-14 - NNN profile tenant count matches the Rent Roll rows assigned to NNN', async ({ page }) => {
    const reimbursementProfilesPage = new ReimbursementProfilesPage(page);
    const rentRollPage = new RentRollPage(page);

    await expect(reimbursementProfilesPage.profileHeader(NNN_PROFILE)).toBeVisible();
    const tenantsAssigned = await reimbursementProfilesPage.tenantsAssignedCount(NNN_PROFILE);

    await rentRollPage.gotoFromTabBar();
    await expect(rentRollPage.locators.grid(page)).toBeVisible();
    const rentRollNnnRows = await rentRollPage.countTenantsWithReimbursementProfile(NNN_PROFILE);

    // Primary assertion: both values are read from the app and must agree.
    expect(rentRollNnnRows).toBe(tenantsAssigned);

    // Secondary: the sample deal's expected value.
    expect(tenantsAssigned).toBe(EXPECTED_NNN_TENANTS);
  });

  test('TC-CUJ-15 - New reimbursement profile keeps its Double net type after save and reload', async ({ page }) => {
    const reimbursementProfilesPage = new ReimbursementProfilesPage(page);

    await expect(reimbursementProfilesPage.heading()).toBeVisible();

    const newProfile = await reimbursementProfilesPage.createProfile();
    // The app auto-numbers repeat creations, so accept `New profile` or `New profile <n>`.
    expect(newProfile).toMatch(/^New profile( \d+)?$/);

    await reimbursementProfilesPage.openProfileDetails(newProfile);
    expect(await reimbursementProfilesPage.typeOptions(newProfile)).toEqual(EXPECTED_TYPE_OPTIONS);

    await reimbursementProfilesPage.setType(newProfile, NEW_PROFILE_TYPE);
    expect(await reimbursementProfilesPage.selectedType(newProfile)).toBe(NEW_PROFILE_TYPE);

    await reimbursementProfilesPage.saveProfile(newProfile);

    await reimbursementProfilesPage.reload();

    await expect(reimbursementProfilesPage.profileHeader(newProfile)).toBeVisible();
    expect(await reimbursementProfilesPage.selectedType(newProfile)).toBe(NEW_PROFILE_TYPE);
  });
});
