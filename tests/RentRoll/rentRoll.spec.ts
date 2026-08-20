import fs from 'node:fs';
import { test, expect, Locator } from '@playwright/test';
import { DealsPage } from '../../pages/Deals/DealsPage';
import { RentRollPage, currencyDisplayTolerance, parseCurrency } from '../../pages/RentRoll/RentRollPage';

const DEAL_NAME = 'Elm Street Plaza';
const AUTH_STATE = 'utils/googleAuthState.json';
const TENANT_NAME = 'Golden Orchid Kitchen';
const TENANT_SUITE_AND_AREA = 'Suite 7 · 2,400 SF';

// TC-CUJ-09 names these columns "Base Rent" and "$/SF"; the app labels the same two columns
// "Scheduled Rent" and "Annual $/SF", so the test asserts the app's real header text.
const BASE_RENT_COLUMN = 'Scheduled Rent';
const RENT_PSF_COLUMN = 'Annual $/SF';
// The panel renders one annual row per year of the deal's Hold Period. Hold Period lives on the
// Valuation & Debt sheet, no test in this suite owns it, and it has already been changed from 11
// to 10 outside the suite - so only the first year is fixed here. The row count and the total-row
// label are read back from the app, and the rows are checked for being a contiguous run.
const FIRST_CASH_FLOW_YEAR = 2025;

const OCCUPIED_TENANTS = 13;
/** Lease citation a configured contractual option carries, e.g. `Option 1 · 2026-03-01 → 2031-02-28`. */
const OPTION_CITATION_PATTERN = /^Option \d+ · \d{4}-\d{2}-\d{2} → \d{4}-\d{2}-\d{2}$/;

async function readMetricValue(locator: Locator, pattern: RegExp): Promise<string> {
  const raw = (await locator.textContent()) ?? '';
  return raw.match(pattern)?.[0] ?? '';
}

test.describe('Rent Roll', () => {
  test.skip(!fs.existsSync(AUTH_STATE), 'No stored authenticated session (utils/googleAuthState.json)');
  test.use({ storageState: AUTH_STATE });

  test.beforeEach(async ({ page }) => {
    const dealsPage = new DealsPage(page);
    await dealsPage.goto();
    await dealsPage.openDeal(DEAL_NAME);
    await new RentRollPage(page).gotoFromTabBar();
  });

  test('TC-CUJ-04 (revised) - KPI metrics strip persists on Rent Roll scroll and across sheet tabs', async ({ page }) => {
    const rentRollPage = new RentRollPage(page);
    const kpi = rentRollPage.kpiStrip();

    for (const tile of Object.values(kpi)) {
      await expect(tile).toBeVisible();
    }

    const beforeScrollBox = await kpi.leveredIrr.boundingBox();
    await rentRollPage.scrollContent(600);
    await expect(kpi.leveredIrr).toBeVisible();
    const afterScrollBox = await kpi.leveredIrr.boundingBox();
    expect(afterScrollBox?.y).toBe(beforeScrollBox?.y);

    await rentRollPage.goToMarketLeasing();
    const kpiOnOtherTab = rentRollPage.kpiStrip();
    for (const tile of Object.values(kpiOnOtherTab)) {
      await expect(tile).toBeVisible();
    }
  });

  test('TC-CUJ-05 - Rent Roll occupancy summary matches sample data', async ({ page }) => {
    const rentRollPage = new RentRollPage(page);

    await expect(rentRollPage.occupancyTile()).toHaveText('98.3%');
    await expect(rentRollPage.waltTile()).toHaveText('2.0 yr');
    await expect(rentRollPage.inPlaceRentTile()).toContainText('$209,388');
    await expect(rentRollPage.inPlaceRentTile()).toContainText('$12.43/SF');
    await expect(rentRollPage.tenantsTile()).toContainText('13');
    await expect(rentRollPage.tenantsTile()).toContainText('1 vacant');
    await expect(rentRollPage.totalSfTile()).toHaveText('17,152');
  });

  test('TC-CUJ-06 - Rent Roll row count matches tenant + vacant count', async ({ page }) => {
    const rentRollPage = new RentRollPage(page);

    const tile = rentRollPage.tenantsTile();
    const fullText = (await tile.textContent()) ?? '';
    const vacantSubLabel = (await tile.locator('span').textContent()) ?? '';
    const occupiedText = fullText.slice(0, fullText.length - vacantSubLabel.length);

    const occupied = Number(occupiedText);
    const vacant = Number(vacantSubLabel.match(/\d+/)?.[0] ?? '0');

    const rowCount = await rentRollPage.dataRowCount();
    expect(rowCount).toBe(occupied + vacant);
    expect(rowCount).toBe(14);
  });

  test('TC-CUJ-07 - Tenant rollover panel shows Contractual Option and Market Assumption', async ({ page }) => {
    const rentRollPage = new RentRollPage(page);

    await expect(rentRollPage.tenantSuite(TENANT_NAME)).toHaveText('7');

    await rentRollPage.openTenantRollover(TENANT_NAME);
    const panel = rentRollPage.rolloverPanel();
    await expect(panel).toBeVisible();
    await expect(panel).toContainText(/Golden Orchid Kitchen/i);
    await expect(panel).toContainText(/what happens at rollover/i);

    const contractual = rentRollPage.contractualFields();
    await expect(rentRollPage.locators.contractualSection(page)).toContainText(/Contractual option/i);
    await expect(contractual.exerciseProbability).toHaveValue('85%');
    await expect(contractual.renewalRate).toHaveValue('$12.50');
    await expect(contractual.term).toHaveValue('5 yr');
    await expect(contractual.ti).toHaveValue('$0.00');
    await expect(contractual.downtime).toHaveValue('0 mo');

    const market = rentRollPage.marketFields();
    await expect(rentRollPage.locators.marketSection(page)).toContainText(/Market assumption/i);
    await expect(market.renewalProbability).toHaveValue('85%');
    await expect(market.marketRentPsf).toHaveValue('$12.00');
    await expect(market.term).toHaveValue('5 yr');
    await expect(market.tiNew).toHaveValue('$10.00');
    await expect(market.downtime).toHaveValue('12 mo');
  });

  test('TC-CUJ-08 - Exercise probability edit recalculates Levered IRR, then restores baseline', async ({ page }) => {
    const rentRollPage = new RentRollPage(page);
    const kpi = rentRollPage.kpiStrip();
    const IRR_PATTERN = /-?\d+(\.\d+)?%/;

    await rentRollPage.openTenantRollover(TENANT_NAME);
    await expect(rentRollPage.rolloverPanel()).toBeVisible();

    const baselineIrr = await readMetricValue(kpi.leveredIrr, IRR_PATTERN);
    expect(baselineIrr).toBe('5.38%');

    try {
      await rentRollPage.setExerciseProbability('50%');
      await expect
        .poll(() => readMetricValue(kpi.leveredIrr, IRR_PATTERN), {
          timeout: 15000,
          message: 'Levered IRR did not change after editing Exercise probability',
        })
        .not.toBe(baselineIrr);
    } finally {
      await rentRollPage.setExerciseProbability('85%');
      await expect
        .poll(() => readMetricValue(kpi.leveredIrr, IRR_PATTERN), {
          timeout: 15000,
          message: 'Levered IRR did not return to baseline after restoring Exercise probability to 85%',
        })
        .toBe(baselineIrr);
    }

    await expect(rentRollPage.contractualFields().exerciseProbability).toHaveValue('85%');
  });

  test('TC-CUJ-09 - Tenant cash flow annual Base Rent rows sum to the displayed total', async ({ page }) => {
    const rentRollPage = new RentRollPage(page);

    await rentRollPage.openTenantRollover(TENANT_NAME);
    await expect(rentRollPage.rolloverPanel()).toBeVisible();

    await rentRollPage.openTenantCashFlow();
    await expect(rentRollPage.cashFlowPanel()).toBeVisible();
    await expect(rentRollPage.cashFlowPanelTitle()).toHaveText(TENANT_NAME);
    await expect(rentRollPage.cashFlowPanelHeader()).toContainText(TENANT_SUITE_AND_AREA);
    await expect(rentRollPage.cashFlowTable()).toBeVisible();

    expect(await rentRollPage.cashFlowColumns()).toEqual([
      'Year',
      'Period',
      BASE_RENT_COLUMN,
      RENT_PSF_COLUMN,
      'Contribution $/SF',
      'Free Rent',
      'Recoveries',
      'Recov $/SF',
      'TI',
      'LC',
      'Net',
    ]);

    const years = await rentRollPage.cashFlowYears();
    expect(years.length, 'Cash flow panel should show at least one annual row').toBeGreaterThan(0);
    expect(years[0], 'Cash flow should start at the first year of the hold').toBe(FIRST_CASH_FLOW_YEAR);
    expect(
      years,
      `Cash flow annual rows should run consecutively from ${years[0]}, with no year missing or repeated`,
    ).toEqual(years.map((_, index) => years[0] + index));

    // The panel names its total row after the number of annual rows it drew, e.g. `10-yr Total`.
    const totalRowLabel = `${years.length}-yr Total`;
    const annualDisplayed = await rentRollPage.cashFlowAnnualValues(years, BASE_RENT_COLUMN);
    const annualSum = annualDisplayed.reduce((sum, value) => sum + parseCurrency(value), 0);

    await expect(
      rentRollPage.cashFlowTotalRow(totalRowLabel),
      `Cash flow panel should show a "${totalRowLabel}" row`,
    ).toBeVisible();

    // NOTE (app-side gap, deliberately left failing): the total row totals Free Rent, Recoveries,
    // TI, LC and Net, but leaves Scheduled Rent, Annual $/SF and Contribution $/SF blank - so there
    // is no Base Rent total for the annual rows to be checked against. Verified against the live
    // panel: the Scheduled Rent cell of the total row is an empty <td>, not a missing column.
    const totalDisplayed = await rentRollPage.cashFlowTotalValue(totalRowLabel, BASE_RENT_COLUMN);
    expect(totalDisplayed, `"${totalRowLabel}" row has no ${BASE_RENT_COLUMN} value`).not.toBe('');

    // The panel renders money rounded for display (e.g. $29K), so exact equality is impossible.
    // Tolerance is derived from the app's own display precision - half a step per displayed value,
    // for each annual row plus the total itself - rather than being an arbitrary allowance.
    const tolerance =
      annualDisplayed.reduce((sum, value) => sum + currencyDisplayTolerance(value), 0) +
      currencyDisplayTolerance(totalDisplayed);

    expect(
      Math.abs(annualSum - parseCurrency(totalDisplayed)),
      `Sum of annual ${BASE_RENT_COLUMN} (${annualDisplayed.join(' + ')} = ${annualSum}) should match the ${totalRowLabel} value ${totalDisplayed}`,
    ).toBeLessThanOrEqual(tolerance);
  });

  // The `OPT` badge is checked against the data behind it: for every occupied tenant the
  // rollover panel's CONTRACTUAL OPTION block is opened and its lease citation and field
  // values decide whether an option is genuinely configured. Nothing is edited.
  test('TC-CUJ-33 - OPT badge appears exactly for tenants with a configured contractual option', async ({ page }) => {
    const rentRollPage = new RentRollPage(page);

    const roster = await rentRollPage.tenantRoster();
    expect(roster.length, 'Occupied tenant rows').toBe(OCCUPIED_TENANTS);

    const badged = roster.filter((tenant) => tenant.hasOptionBadge).map((tenant) => tenant.name);
    const unbadged = roster.filter((tenant) => !tenant.hasOptionBadge).map((tenant) => tenant.name);

    // The reference expectation for the sample deal, asserted after the badges were read
    // rather than instead of reading them.
    expect(badged.length, `Tenants showing OPT: [${badged.join(', ')}]`).toBe(OCCUPIED_TENANTS);
    expect(unbadged, 'Occupied tenants without an OPT badge').toEqual([]);

    // The named sample tenant, checked in full.
    expect(roster.map((tenant) => tenant.name)).toContain(TENANT_NAME);
    await rentRollPage.openTenantRollover(TENANT_NAME);
    await expect(rentRollPage.rolloverPanel()).toBeVisible();
    await expect(rentRollPage.contractualSection()).toContainText(/Contractual option · in the lease/i);
    expect(await rentRollPage.contractualCitation()).toMatch(OPTION_CITATION_PATTERN);

    const sampleFields = await rentRollPage.contractualValues();
    expect(sampleFields.exerciseProbability).toMatch(/^\d+(\.\d+)?%$/);
    expect(parseFloat(sampleFields.exerciseProbability)).toBeGreaterThan(0);
    expect(parseCurrency(sampleFields.renewalRate)).toBeGreaterThan(0);
    expect(parseFloat(sampleFields.term)).toBeGreaterThan(0);
    await rentRollPage.closeTenantRollover();

    // Every occupied tenant: the badge has to agree with the option actually configured.
    for (const tenant of roster) {
      await rentRollPage.openTenantRollover(tenant.name);
      await expect(rentRollPage.rolloverPanel()).toBeVisible();

      const citation = await rentRollPage.contractualCitation();
      const fields = await rentRollPage.contractualValues();
      const configured =
        citation !== null &&
        OPTION_CITATION_PATTERN.test(citation) &&
        parseFloat(fields.exerciseProbability) > 0 &&
        parseFloat(fields.term) > 0;

      expect(
        configured,
        tenant.hasOptionBadge
          ? `${tenant.name} shows OPT, so it should hold a configured contractual option (citation: ${citation})`
          : `${tenant.name} shows no OPT, so its Contractual Option should be unconfigured (citation: ${citation})`,
      ).toBe(tenant.hasOptionBadge);

      await rentRollPage.closeTenantRollover();
    }
  });
});
