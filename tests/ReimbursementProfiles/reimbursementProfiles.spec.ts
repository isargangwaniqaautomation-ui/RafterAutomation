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

  test('TC-CUJ-30 - NNN profile assigned tenants match the Rent Roll rows marked NNN', async ({ page }) => {
    const reimbursementProfilesPage = new ReimbursementProfilesPage(page);
    const rentRollPage = new RentRollPage(page);

    // Rent Roll first: every tenant row, with the suite and the profile the grid shows.
    await rentRollPage.gotoFromTabBar();
    const roster = await rentRollPage.tenantRoster();
    const rentRollNnn = roster
      .filter((tenant) => tenant.reimbursementProfile === NNN_PROFILE)
      .map((tenant) => ({ suite: tenant.suite, name: tenant.name }));

    expect(rentRollNnn.length, 'Rent Roll rows assigned to NNN').toBe(EXPECTED_NNN_TENANTS);

    // Then the profile's own Assigned Tenants list.
    await reimbursementProfilesPage.gotoFromTabBar();
    await reimbursementProfilesPage.openProfileDetails(NNN_PROFILE);
    await expect(reimbursementProfilesPage.assignedTenantsCaption(NNN_PROFILE)).toBeVisible();

    const captionCount = await reimbursementProfilesPage.assignedTenantsCaptionCount(NNN_PROFILE);
    const profileTenants = await reimbursementProfilesPage.assignedTenants(NNN_PROFILE);

    expect(captionCount, 'Assigned tenants caption should agree with the chips it heads').toBe(profileTenants.length);
    expect(captionCount, 'Assigned tenants count should match the Rent Roll NNN rows').toBe(rentRollNnn.length);
    expect(await reimbursementProfilesPage.tenantsAssignedCount(NNN_PROFILE)).toBe(rentRollNnn.length);
    expect(captionCount).toBe(EXPECTED_NNN_TENANTS);

    // The identities have to match too, not just the count. Whitespace and case are normalised;
    // a different tenant or a different suite is not.
    const key = (tenant: { suite: string; name: string }) =>
      `${tenant.suite.replace(/\s+/g, ' ').trim().toLowerCase()} · ${tenant.name.replace(/\s+/g, ' ').trim().toLowerCase()}`;
    const rentRollKeys = rentRollNnn.map(key).sort();
    const profileKeys = profileTenants.map(key).sort();

    const missing = rentRollKeys.filter((tenant) => !profileKeys.includes(tenant));
    const extra = profileKeys.filter((tenant) => !rentRollKeys.includes(tenant));
    expect(missing, 'NNN tenants on the Rent Roll that the profile does not list').toEqual([]);
    expect(extra, 'Tenants the profile lists that are not NNN on the Rent Roll').toEqual([]);
    expect(profileKeys, 'Tenant and suite mapping should match exactly').toEqual(rentRollKeys);

    // Read-only check: the profile is left exactly as it was found.
    await reimbursementProfilesPage.closeProfileDetails(NNN_PROFILE);
  });
});
