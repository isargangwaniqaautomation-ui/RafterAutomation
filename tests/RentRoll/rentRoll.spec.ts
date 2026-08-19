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
const CASH_FLOW_YEARS = [2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035];
const TOTAL_ROW_LABEL = '11-yr Total';

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

    expect(
      await rentRollPage.cashFlowYears(),
      `Cash flow panel should show annual rows ${CASH_FLOW_YEARS[0]}-${CASH_FLOW_YEARS[CASH_FLOW_YEARS.length - 1]}`,
    ).toEqual(CASH_FLOW_YEARS);

    const annualDisplayed = await rentRollPage.cashFlowAnnualValues(CASH_FLOW_YEARS, BASE_RENT_COLUMN);
    const annualSum = annualDisplayed.reduce((sum, value) => sum + parseCurrency(value), 0);

    await expect(
      rentRollPage.cashFlowTotalRow(TOTAL_ROW_LABEL),
      `Cash flow panel should show a "${TOTAL_ROW_LABEL}" row`,
    ).toBeVisible();

    const totalDisplayed = await rentRollPage.cashFlowTotalValue(TOTAL_ROW_LABEL, BASE_RENT_COLUMN);
    expect(totalDisplayed, `"${TOTAL_ROW_LABEL}" row has no ${BASE_RENT_COLUMN} value`).not.toBe('');

    // The panel renders money rounded for display (e.g. $29K), so exact equality is impossible.
    // Tolerance is derived from the app's own display precision - half a step per displayed value,
    // for each annual row plus the total itself - rather than being an arbitrary allowance.
    const tolerance =
      annualDisplayed.reduce((sum, value) => sum + currencyDisplayTolerance(value), 0) +
      currencyDisplayTolerance(totalDisplayed);

    expect(
      Math.abs(annualSum - parseCurrency(totalDisplayed)),
      `Sum of annual ${BASE_RENT_COLUMN} (${annualDisplayed.join(' + ')} = ${annualSum}) should match the ${TOTAL_ROW_LABEL} value ${totalDisplayed}`,
    ).toBeLessThanOrEqual(tolerance);
  });
});
