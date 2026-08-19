import fs from 'node:fs';
import { test, expect, Locator } from '@playwright/test';
import { DealsPage } from '../../pages/Deals/DealsPage';
import { DashboardPage } from '../../pages/Dashboard/DashboardPage';
import { GeneralPage } from '../../pages/General/GeneralPage';
import { RentRollPage, parseCurrency } from '../../pages/RentRoll/RentRollPage';
import { ValuationDebtPage, parsePercent } from '../../pages/ValuationDebt/ValuationDebtPage';

// TC-CUJ-25 names the deal `Elm 123 Street Plaza`; the workspace holds a single sample deal,
// `Elm Street Plaza`, which is the deal every other TC-CUJ case edits.
const DEAL_NAME = 'Elm Street Plaza';
const AUTH_STATE = 'utils/googleAuthState.json';

const TENANT_NAME = 'Golden Orchid Kitchen';
const EXERCISE_PROBABILITY = '50%';
const GENERAL_VACANCY = 'General Vacancy';
const TEST_VACANCY = '5.00';
const SOLVE_METRIC = 'Unlevered IRR';
const SOLVE_TARGET = '12.0';
const SOLVE_LEVER = 'Purchase price';
// Metrics are displayed to two decimals, so one displayed step is the tightest tolerance
// the two screens can be held to.
const IRR_TOLERANCE = 0.01;
const METRIC_PRECISION = 2;

/** Sticky KPI tiles animate per digit; the plain value is the first number in their text. */
async function readMetricValue(locator: Locator): Promise<string> {
  const raw = (await locator.textContent()) ?? '';
  return raw.match(/-?\d+(\.\d+)?[%x]/)?.[0] ?? '';
}

test.describe('Deals', () => {
  test.skip(!fs.existsSync(AUTH_STATE), 'No stored authenticated session (utils/googleAuthState.json)');
  test.use({ storageState: AUTH_STATE });

  test('TC_DEALS_001 - Deals list renders summary columns for a deal', async ({ page }) => {
    const dealsPage = new DealsPage(page);
    await dealsPage.goto();

    const row = dealsPage.dealRow(DEAL_NAME);
    await expect(row).toBeVisible();

    const cells = dealsPage.summaryCells(DEAL_NAME);
    for (const cell of Object.values(cells)) {
      await expect(cell).not.toBeEmpty();
    }
  });

  test('TC_DEALS_002 - clicking a deal navigates to its Dashboard', async ({ page }) => {
    const dealsPage = new DealsPage(page);
    await dealsPage.goto();
    await dealsPage.openDeal(DEAL_NAME);

    await expect(dealsPage.breadcrumbDealsLink()).toBeVisible();
    await expect(dealsPage.breadcrumbDealName()).toHaveText(DEAL_NAME);
    await expect(dealsPage.underwritingSummaryHeading()).toBeVisible();
  });

  test('TC-CUJ-25 - Deals list summary metrics match the Dashboard after editing the deal', async ({ page }) => {
    test.setTimeout(300000);

    const dealsPage = new DealsPage(page);
    const rentRollPage = new RentRollPage(page);
    const generalPage = new GeneralPage(page);
    const valuationDebtPage = new ValuationDebtPage(page);
    const dashboardPage = new DashboardPage(page);

    await dealsPage.goto();
    await dealsPage.openDeal(DEAL_NAME);

    // Step 1 - Exercise probability, captured before it is changed so it can be restored.
    await rentRollPage.gotoFromTabBar();
    await rentRollPage.openTenantRollover(TENANT_NAME);
    await expect(rentRollPage.rolloverPanel()).toBeVisible();
    const originalExerciseProbability = await rentRollPage.contractualFields().exerciseProbability.inputValue();

    let originalVacancy = '';
    let originalPurchasePrice = '';

    try {
      const leveredIrrTile = rentRollPage.kpiStrip().leveredIrr;
      const irrBeforeEdit = await readMetricValue(leveredIrrTile);

      await rentRollPage.setExerciseProbability(EXERCISE_PROBABILITY);
      await expect
        .poll(() => readMetricValue(leveredIrrTile), {
          timeout: 30000,
          message: 'Levered IRR did not recalculate after editing Exercise probability',
        })
        .not.toBe(irrBeforeEdit);

      // Step 2 - General Vacancy.
      await generalPage.gotoFromTabBar();
      originalVacancy = await generalPage.fieldValue(GENERAL_VACANCY).innerText();
      await generalPage.setFieldValue(GENERAL_VACANCY, TEST_VACANCY);
      // The edit lands while the model is still recalculating step 1, so the sheet can take a
      // moment to settle on the committed value.
      await expect(generalPage.fieldValue(GENERAL_VACANCY)).toHaveText(`${TEST_VACANCY}%`, { timeout: 20000 });

      // Step 3 - Solve Purchase Price for a 12.0% Unlevered IRR.
      await valuationDebtPage.gotoFromTabBar();
      originalPurchasePrice = await valuationDebtPage.purchasePrice();
      await valuationDebtPage.configureSolve(SOLVE_METRIC, SOLVE_TARGET, SOLVE_LEVER);
      await valuationDebtPage.solve();
      await expect
        .poll(() => valuationDebtPage.solveNote(), {
          timeout: 20000,
          message: `Solve to Target reported nothing for a ${SOLVE_TARGET}% ${SOLVE_METRIC}`,
        })
        .not.toBe('');

      // The solve outcome is asserted softly so that a refusal by the solver still fails the
      // test while letting the Deals-list-versus-Dashboard regression check run and report.
      const solveNote = await valuationDebtPage.solveNote();
      const solved = solveNote.includes('Solved');
      expect
        .soft(solveNote, `Solve to Target did not write a Purchase Price for a ${SOLVE_TARGET}% ${SOLVE_METRIC}`)
        .toContain('Solved');

      if (solved) {
        await expect
          .poll(() => valuationDebtPage.purchasePrice(), {
            timeout: 30000,
            message: `Purchase Price did not change after solving for a ${SOLVE_TARGET}% ${SOLVE_METRIC}`,
          })
          .not.toBe(originalPurchasePrice);

        // The solved target stays pinned and re-solves on every later change, which never lets
        // the page go idle. Unpinning keeps the solved price and lets the rest of the deal settle.
        await valuationDebtPage.unpinSolve();
      }

      // Step 4 - Dashboard values, captured after all three edits.
      await valuationDebtPage.goToDashboard();

      if (solved) {
        const solvedIrr = await valuationDebtPage.unleveredIrr();
        expect(
          Math.abs(parsePercent(solvedIrr) - Number(SOLVE_TARGET)),
          `Resulting Unlevered IRR ${solvedIrr} should be approximately ${SOLVE_TARGET}%`,
        ).toBeLessThanOrEqual(IRR_TOLERANCE);
      }

      const dashboard = await dashboardPage.currentMetrics();

      // Step 5 - the same deal's row on the Deals list.
      await dealsPage.goto();
      const cells = dealsPage.summaryCells(DEAL_NAME);
      await expect(dealsPage.dealRow(DEAL_NAME)).toBeVisible();
      const dealsList = {
        irr: (await cells.irr.innerText()).trim(),
        em: (await cells.em.innerText()).trim(),
        cap: (await cells.cap.innerText()).trim(),
        minDscr: (await cells.minDscr.innerText()).trim(),
      };

      // Step 6 - the list must show the Dashboard's current values, not stale ones.
      expect(
        parsePercent(dealsList.irr),
        `Deals List IRR does not match Dashboard Levered IRR.\nDashboard: ${dashboard.leveredIrr}\nDeals List: ${dealsList.irr}`,
      ).toBeCloseTo(parsePercent(dashboard.leveredIrr), METRIC_PRECISION);
      expect(
        parsePercent(dealsList.em),
        `Deals List EM does not match Dashboard Equity Multiple.\nDashboard: ${dashboard.equityMultiple}\nDeals List: ${dealsList.em}`,
      ).toBeCloseTo(parsePercent(dashboard.equityMultiple), METRIC_PRECISION);
      expect(
        parsePercent(dealsList.cap),
        `Deals List CAP does not match Dashboard Going-in Cap.\nDashboard: ${dashboard.goingInCap}\nDeals List: ${dealsList.cap}`,
      ).toBeCloseTo(parsePercent(dashboard.goingInCap), METRIC_PRECISION);
      expect(
        parsePercent(dealsList.minDscr),
        `Deals List MIN DSCR does not match Dashboard Min DSCR.\nDashboard: ${dashboard.minDscr}\nDeals List: ${dealsList.minDscr}`,
      ).toBeCloseTo(parsePercent(dashboard.minDscr), METRIC_PRECISION);
    } finally {
      // Restore all three edits, whatever the assertions did.
      await dealsPage.goto();
      await dealsPage.openDeal(DEAL_NAME);

      if (originalPurchasePrice) {
        await valuationDebtPage.gotoFromTabBar();
        // A still-pinned solve would immediately re-solve the price away again.
        await valuationDebtPage.unpinSolve();
        await valuationDebtPage.setPurchasePrice(String(parseCurrency(originalPurchasePrice)));
        await expect
          .poll(() => valuationDebtPage.purchasePrice(), {
            timeout: 30000,
            message: `Purchase Price was not restored to ${originalPurchasePrice}`,
          })
          .toBe(originalPurchasePrice);
      }

      if (originalVacancy) {
        await generalPage.gotoFromTabBar();
        await generalPage.setFieldValue(GENERAL_VACANCY, originalVacancy.replace('%', ''));
        await expect(generalPage.fieldValue(GENERAL_VACANCY)).toHaveText(originalVacancy);
      }

      await rentRollPage.gotoFromTabBar();
      await rentRollPage.openTenantRollover(TENANT_NAME);
      await rentRollPage.setExerciseProbability(originalExerciseProbability);
      await expect(rentRollPage.contractualFields().exerciseProbability).toHaveValue(originalExerciseProbability);
    }
  });
});
