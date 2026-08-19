import { Page } from '@playwright/test';
import { ValuationDebtLocators } from './ValuationDebtLocators';

/** Converts a displayed percentage into a number, e.g. `6.15%` -> 6.15. */
export function parsePercent(display: string): number {
  const match = display.trim().match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    throw new Error(`Unrecognised percentage format: "${display}"`);
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
    await this.page.waitForLoadState('networkidle');
    await this.locators.solveCard(this.page).waitFor({ state: 'visible' });
  }

  async goToDashboard() {
    await this.locators.dashboardTab(this.page).click();
    await this.page.waitForLoadState('networkidle');
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
}
