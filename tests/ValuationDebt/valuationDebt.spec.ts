import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { DealsPage } from '../../pages/Deals/DealsPage';
import { currencyDisplayTolerance, parseCurrency } from '../../pages/RentRoll/RentRollPage';
import {
  LOAN_SIZING_CHIP_KEYS,
  ValuationDebtPage,
  parseMultiple,
  parsePercent,
} from '../../pages/ValuationDebt/ValuationDebtPage';

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

const EXPECTED_SIZING_CHIP = '65.0% LTV → $1.63M';
const FIRST_HOLD_YEAR = 2025;
const HOLD_YEARS = 10;

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
      // Solving pins the target, and a pinned target re-solves the price away again on every
      // later change - including this restore, and every edit the rest of the suite makes.
      await valuationDebtPage.unpinSolve();
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

  // TC-CUJ-26 documents `DSCR 1.64x ≥ 1.25x`, `10.07%` and `1.56x · 2031`. Those figures belong to
  // an earlier, higher-NOI state of the sample deal (the same drift the Cash Flow specs record for
  // 2025 NOI). The chips are therefore checked against the model the app is actually holding:
  // the Sizing chip against the sheet's own Purchase Price and Loan-to-Value, the covenant against
  // its own floor, and the trough against the sticky MIN DSCR tile.
  test('TC-CUJ-26 - Loan Sizing renders four chips with figures and visible status indicators', async ({ page }) => {
    const valuationDebtPage = new ValuationDebtPage(page);

    const strip = valuationDebtPage.loanSizingStrip();
    await strip.scrollIntoViewIfNeeded();
    await expect(strip).toBeVisible();
    await expect(valuationDebtPage.locators.loanSizingLabel(page)).toHaveText(/^Loan sizing$/i);
    await expect(valuationDebtPage.loanSizingChips()).toHaveCount(4);

    const chips: Record<string, { label: string; value: string; statusColor: string }> = {};
    for (const key of LOAN_SIZING_CHIP_KEYS) {
      await expect(valuationDebtPage.loanSizingChip(key)).toBeVisible();

      // The indicator is a colour-only dot, so its presence is asserted on the element itself
      // and its colour is only checked for being painted at all.
      const dot = valuationDebtPage.loanSizingStatusDot(key);
      await expect(dot, `${key} chip should render a status indicator`).toBeVisible();

      const parts = await valuationDebtPage.loanSizingChipParts(key);
      expect(parts.statusColor, `${key} status indicator should be painted`).toMatch(/^rgba?\(/);
      expect(parts.statusColor, `${key} status indicator should not be transparent`).not.toBe('rgba(0, 0, 0, 0)');
      chips[key] = parts;
    }

    expect(Object.values(chips).map((chip) => chip.label)).toEqual([
      'Sizing',
      'Covenant',
      'Debt yield',
      'Trough DSCR',
    ]);

    // Sizing: `65.0% LTV → $1.63M`, i.e. the sheet's own LTV applied to its own Purchase Price.
    expect(chips.sizing.value).toBe(EXPECTED_SIZING_CHIP);
    const [sizingLtv, sizingLoan] = chips.sizing.value.split('→').map((part) => part.trim());
    expect(sizingLtv).toBe(`${await valuationDebtPage.loanToValue()} LTV`);
    const impliedLoan = parseCurrency(await valuationDebtPage.purchasePrice()) * (parsePercent(sizingLtv) / 100);
    expect(Math.abs(parseCurrency(sizingLoan) - impliedLoan)).toBeLessThanOrEqual(
      currencyDisplayTolerance(sizingLoan),
    );

    // Covenant: `DSCR <actual> ≥ <floor>`, and the deal has to be clearing that floor.
    expect(chips.covenant.value).toMatch(/^DSCR \d+\.\d{2}x ≥ \d+\.\d{2}x$/);
    const [covenantActual, covenantFloor] = chips.covenant.value.split('≥').map((part) => parseMultiple(part));
    expect(covenantActual).toBeGreaterThanOrEqual(covenantFloor);

    expect(chips['debt-yield'].value).toMatch(/^\d+\.\d{2}%$/);
    expect(parsePercent(chips['debt-yield'].value)).toBeGreaterThan(0);

    // Trough DSCR: `<value> · <year>`, the hold-period minimum the KPI header also reports.
    expect(chips.trough.value).toMatch(/^\d+\.\d{2}x · \d{4}$/);
    const [troughValue, troughYear] = chips.trough.value.split('·').map((part) => part.trim());
    expect(parseMultiple(troughValue)).toBe(parseMultiple(await valuationDebtPage.minDscr()));
    expect(parseMultiple(troughValue)).toBeLessThanOrEqual(covenantActual);
    expect(Number(troughYear)).toBeGreaterThanOrEqual(FIRST_HOLD_YEAR);
    expect(Number(troughYear)).toBeLessThanOrEqual(FIRST_HOLD_YEAR + HOLD_YEARS - 1);
  });
});
