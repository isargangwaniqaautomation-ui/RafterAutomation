import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { DealsPage } from '../../pages/Deals/DealsPage';
import { parseCurrency } from '../../pages/RentRoll/RentRollPage';
import { ValuationDebtPage, parsePercent } from '../../pages/ValuationDebt/ValuationDebtPage';

const DEAL_NAME = 'Elm Street Plaza';
const AUTH_STATE = 'utils/googleAuthState.json';

const BASELINE_PURCHASE_PRICE = '$2,500,000';
const BASELINE_HEADER_PRICE = '$2.50M';
const BASELINE_LTV = '65.0%';
const BASELINE_INTEREST_RATE = '6.15%';
const BASELINE_AMORTIZATION = '30 yr';

const SOLVE_METRIC = 'Unlevered IRR';
const SOLVE_TARGET = '12.0';
const SOLVE_LEVER = 'Purchase price';
// The solved IRR is displayed to two decimals, so one displayed step is the tightest
// tolerance the UI can actually be held to.
const IRR_TOLERANCE = 0.01;

test.describe('Valuation & Debt', () => {
  test.skip(!fs.existsSync(AUTH_STATE), 'No stored authenticated session (utils/googleAuthState.json)');
  test.use({ storageState: AUTH_STATE });

  test.beforeEach(async ({ page }) => {
    const dealsPage = new DealsPage(page);
    await dealsPage.goto();
    await dealsPage.openDeal(DEAL_NAME);
    await new ValuationDebtPage(page).gotoFromTabBar();
  });

  test('TC-CUJ-18 - Purchase Price matches the header PRICE tile and the debt terms baseline', async ({ page }) => {
    const valuationDebtPage = new ValuationDebtPage(page);
    const locators = valuationDebtPage.locators;

    await expect(locators.returnsBar(page)).toBeVisible();
    await expect(locators.holdAndExitCard(page)).toBeVisible();
    await expect(locators.fieldLabel(valuationDebtPage.purchasePriceField())).toHaveText('Purchase Price');

    const purchasePrice = await valuationDebtPage.purchasePrice();
    const headerPrice = await valuationDebtPage.headerPrice();

    // The two are formatted differently ($2,500,000 vs $2.50M), so they are compared numerically.
    expect(
      parseCurrency(purchasePrice),
      `Purchase Price ${purchasePrice} should represent the same amount as the header PRICE tile ${headerPrice}`,
    ).toBe(parseCurrency(headerPrice));

    expect(purchasePrice).toBe(BASELINE_PURCHASE_PRICE);
    expect(headerPrice).toBe(BASELINE_HEADER_PRICE);

    await expect(locators.debtAndLoanTermsCard(page)).toBeVisible();
    await expect(locators.fieldLabel(locators.ltvField(page))).toHaveText('Loan-to-Value');
    await expect(locators.fieldLabel(locators.interestRateField(page))).toHaveText('Interest Rate');
    await expect(locators.fieldLabel(locators.amortizationField(page))).toHaveText('Amortization');

    expect(await valuationDebtPage.loanToValue()).toBe(BASELINE_LTV);
    expect(await valuationDebtPage.interestRate()).toBe(BASELINE_INTEREST_RATE);
    expect(await valuationDebtPage.amortization()).toBe(BASELINE_AMORTIZATION);
  });

  test('TC-CUJ-19 - Solve to Target lowers Purchase Price to hit a 12.0% Unlevered IRR', async ({ page }) => {
    const valuationDebtPage = new ValuationDebtPage(page);

    await expect(valuationDebtPage.locators.solveCard(page)).toBeVisible();
    await valuationDebtPage.configureSolve(SOLVE_METRIC, SOLVE_TARGET, SOLVE_LEVER);
    await expect(valuationDebtPage.locators.solveButton(page)).toBeEnabled();

    const baselinePrice = await valuationDebtPage.purchasePrice();
    expect(baselinePrice).toBe(BASELINE_PURCHASE_PRICE);
    const baselineAmount = parseCurrency(baselinePrice);

    try {
      await valuationDebtPage.solve();

      await expect
        .poll(() => valuationDebtPage.purchasePrice(), {
          timeout: 60000,
          message: `Purchase Price did not change after solving for a ${SOLVE_TARGET}% ${SOLVE_METRIC}`,
        })
        .not.toBe(baselinePrice);

      const solvedPrice = await valuationDebtPage.purchasePrice();
      expect(
        parseCurrency(solvedPrice),
        `Solved Purchase Price ${solvedPrice} should be lower than the ${baselinePrice} baseline`,
      ).toBeLessThan(baselineAmount);

      // The sticky KPI header carries no Unlevered IRR tile; the value lives on the Dashboard hero.
      await valuationDebtPage.goToDashboard();
      const resultingIrr = await valuationDebtPage.unleveredIrr();
      expect(
        Math.abs(parsePercent(resultingIrr) - Number(SOLVE_TARGET)),
        `Resulting Unlevered IRR ${resultingIrr} should be approximately ${SOLVE_TARGET}%`,
      ).toBeLessThanOrEqual(IRR_TOLERANCE);
    } finally {
      await valuationDebtPage.gotoFromTabBar();
      await valuationDebtPage.setPurchasePrice(String(baselineAmount));

      await expect
        .poll(() => valuationDebtPage.purchasePrice(), {
          timeout: 30000,
          message: `Purchase Price was not restored to the ${baselinePrice} baseline`,
        })
        .toBe(baselinePrice);
      await expect
        .poll(() => valuationDebtPage.headerPrice(), {
          timeout: 30000,
          message: `Header PRICE tile did not return to ${BASELINE_HEADER_PRICE}`,
        })
        .toBe(BASELINE_HEADER_PRICE);
    }
  });
});
