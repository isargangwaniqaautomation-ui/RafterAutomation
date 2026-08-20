import { Page } from '@playwright/test';
import { ValuationDebtLocators } from './ValuationDebtLocators';

/** The four chips the LOAN SIZING strip renders, in the order the sheet renders them. */
export const LOAN_SIZING_CHIP_KEYS = ['sizing', 'covenant', 'debt-yield', 'trough'] as const;
export type LoanSizingChipKey = (typeof LOAN_SIZING_CHIP_KEYS)[number];

/** Converts a displayed percentage into a number, e.g. `6.15%` -> 6.15. */
export function parsePercent(display: string): number {
  const match = display.trim().match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    throw new Error(`Unrecognised percentage format: "${display}"`);
  }
  return Number(match[0]);
}

/** Converts a displayed multiple into a number, e.g. `1.31x` -> 1.31. */
export function parseMultiple(display: string): number {
  const match = display.trim().match(/-?\d+(?:\.\d+)?(?=x)/);
  if (!match) {
    throw new Error(`Unrecognised multiple format: "${display}"`);
  }
  return Number(match[0]);
}

export class ValuationDebtPage {
  readonly page: Page;
  readonly locators = ValuationDebtLocators;

  constructor(page: Page) {
    this.page = page;
  }

  async gotoFromTabBar() {
    await this.locators.valuationDebtTab(this.page).click();
    await this.locators.solveCard(this.page).waitFor({ state: 'visible' });
  }

  async goToDashboard() {
    await this.locators.dashboardTab(this.page).click();
    await this.locators.heroUnleveredIrr(this.page).waitFor({ state: 'visible' });
  }

  /** Displayed `PRICE` value in the sticky KPI header, e.g. `$2.50M`. */
  async headerPrice(): Promise<string> {
    const metric = this.locators.priceMetric(this.page);
    return (await this.locators.metricValue(metric).innerText()).trim();
  }

  /** Displayed Unlevered IRR on the Dashboard hero, e.g. `12.00%`. */
  async unleveredIrr(): Promise<string> {
    return (await this.locators.heroUnleveredIrr(this.page).innerText()).trim();
  }

  purchasePriceField() {
    return this.locators.purchasePriceField(this.page);
  }

  /** Displayed `Purchase Price`, e.g. `$2,500,000`. */
  async purchasePrice(): Promise<string> {
    return (await this.locators.fieldValue(this.purchasePriceField()).innerText()).trim();
  }

  async loanToValue(): Promise<string> {
    return (await this.locators.fieldValue(this.locators.ltvField(this.page)).innerText()).trim();
  }

  async interestRate(): Promise<string> {
    return (await this.locators.fieldValue(this.locators.interestRateField(this.page)).innerText()).trim();
  }

  async amortization(): Promise<string> {
    return (await this.locators.fieldValue(this.locators.amortizationField(this.page)).innerText()).trim();
  }

  /** Commits a new Purchase Price through the field's own click-to-edit editor. */
  async setPurchasePrice(value: string) {
    await this.purchasePriceField().click();
    const editor = this.locators.fieldEditor(this.page, 'Purchase Price');
    await editor.fill(value);
    await editor.press('Enter');
    await editor.waitFor({ state: 'detached' });
  }

  async configureSolve(metric: string, target: string, lever: string) {
    await this.locators.solveMetricSelect(this.page).selectOption({ label: metric });
    await this.locators.solveTargetInput(this.page).fill(target);
    await this.locators.solveLeverSelect(this.page).selectOption({ label: lever });
  }

  async solve() {
    await this.locators.solveButton(this.page).click();
  }

  /** Confirmation text the solve card shows once the goal seek has been written to the model. */
  async solveNote(): Promise<string> {
    return (await this.locators.solveNote(this.page).innerText()).trim();
  }

  isSolvePinned() {
    return this.locators.solveUnpinButton(this.page).isVisible();
  }

  /**
   * Solving pins the target to the returns bar, where the app keeps re-solving it on every
   * later change. Unpinning keeps the solved Purchase Price but stops the live re-solve.
   */
  async unpinSolve() {
    const unpinButton = this.locators.solveUnpinButton(this.page);
    if (await unpinButton.isVisible()) {
      await unpinButton.click();
      await unpinButton.waitFor({ state: 'hidden' });
    }
  }

  loanSizingStrip() {
    return this.locators.loanSizingStrip(this.page);
  }

  loanSizingChips() {
    return this.locators.loanSizingChips(this.page);
  }

  loanSizingChip(key: LoanSizingChipKey) {
    return this.locators.loanSizingChip(this.page, key);
  }

  /** The colour-only status dot a Loan Sizing chip leads with. */
  loanSizingStatusDot(key: LoanSizingChipKey) {
    return this.locators.chipStatusDot(this.loanSizingChip(key));
  }

  /** Caption, figure and rendered status colour of one Loan Sizing chip. */
  async loanSizingChipParts(key: LoanSizingChipKey): Promise<{ label: string; value: string; statusColor: string }> {
    const chip = this.loanSizingChip(key);
    return {
      label: (await this.locators.chipLabel(chip).innerText()).trim(),
      value: (await this.locators.chipValue(chip).innerText()).trim(),
      statusColor: await this.locators
        .chipStatusDot(chip)
        .evaluate((element) => getComputedStyle(element).backgroundColor),
    };
  }

  /** Hold-period minimum DSCR from the sticky KPI header, e.g. `1.31x`. */
  async minDscr(): Promise<string> {
    const metric = this.locators.minDscrMetric(this.page);
    return (await this.locators.metricValue(metric).innerText()).trim();
  }
}
