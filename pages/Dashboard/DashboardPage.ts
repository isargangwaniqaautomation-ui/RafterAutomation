import { Page, expect } from '@playwright/test';
import { DashboardLocators } from './DashboardLocators';

/** Sources & Uses rows, keyed by the test id suffix the panel renders. */
export type SourcesUsesRowKey =
  | 'senior-debt'
  | 'equity'
  | 'purchase-price'
  | 'closing-costs'
  | 'financing-costs'
  | 'operating-reserve';

export class DashboardPage {
  readonly page: Page;
  readonly locators = DashboardLocators;

  constructor(page: Page) {
    this.page = page;
  }

  async gotoFromTabBar() {
    await this.locators.dashboardTab(this.page).click();
    await this.locators.yr1NoiTile(this.page).waitFor({ state: 'visible' });
  }

  yr1NoiTile() {
    return this.locators.yr1NoiTile(this.page);
  }

  /**
   * The four headline metrics the Deals list summarises, as the Dashboard displays them.
   * The Dashboard replaces the sticky KPI header with this hero grid, so these are the
   * page's own current values, e.g. `5.38%`, `1.60x`, `5.53%`, `1.31x`.
   */
  async currentMetrics(): Promise<{
    leveredIrr: string;
    equityMultiple: string;
    goingInCap: string;
    minDscr: string;
  }> {
    const capSubLine = (await this.locators.goingInCapSubLine(this.page).innerText()).trim();
    const goingInCap = (await this.locators.goingInCapTile(this.page).innerText()).replace(capSubLine, '').trim();

    // The DSCR tile leads with the Yr1 figure; the Deals list column reports the hold-period
    // minimum, which the tile carries in its `min 1.31x · 2031` sub-line.
    const dscrSubLine = (await this.locators.dscrSubLine(this.page).innerText()).trim();
    const minDscr = dscrSubLine.match(/min\s+(-?\d+(?:\.\d+)?x)/)?.[1];
    if (!minDscr) {
      throw new Error(`Unrecognised DSCR sub-line: "${dscrSubLine}"`);
    }

    return {
      leveredIrr: (await this.locators.leveredIrrTile(this.page).innerText()).trim(),
      equityMultiple: (await this.locators.equityMultipleTile(this.page).innerText()).trim(),
      goingInCap,
      minDscr,
    };
  }

  returnTiles() {
    return {
      leveredIrr: this.locators.leveredIrrTile(this.page),
      equityMultiple: this.locators.equityMultipleTile(this.page),
      unleveredIrr: this.locators.unleveredIrrTile(this.page),
      cashOnCash: this.locators.cashOnCashTile(this.page),
    };
  }

  sourcesUsesPanel() {
    return this.locators.sourcesUses(this.page);
  }

  susRow(key: SourcesUsesRowKey) {
    return this.locators.susRow(this.page, key);
  }

  /** Displayed label of a Sources & Uses row, e.g. `Senior debt · 65.0% LTV`. */
  async susRowLabel(key: SourcesUsesRowKey): Promise<string> {
    return (await this.locators.susRowLabel(this.susRow(key)).innerText()).trim();
  }

  /** Displayed money figure of a Sources & Uses row, e.g. `$1,625,000`. */
  async susRowAmount(key: SourcesUsesRowKey): Promise<string> {
    return (await this.locators.susRowValue(this.susRow(key)).innerText()).trim();
  }

  async totalSources(): Promise<string> {
    return (await this.locators.susTotalValue(this.locators.susTotalSources(this.page)).innerText()).trim();
  }

  async totalUses(): Promise<string> {
    return (await this.locators.susTotalValue(this.locators.susTotalUses(this.page)).innerText()).trim();
  }

  trialNotice() {
    return this.locators.trialNotice(this.page);
  }

  upgradeButton() {
    return this.locators.trialUpgradeButton(this.page);
  }

  collapseTrialNoticeButton() {
    return this.locators.trialCollapseButton(this.page);
  }

  async isTrialNoticeCollapsed(): Promise<boolean> {
    return (await this.trialNotice().getAttribute('data-collapsed')) === 'true';
  }

  async collapseTrialNotice() {
    await this.collapseTrialNoticeButton().click();
    await expect(this.trialNotice()).toHaveAttribute('data-collapsed', 'true');
  }

  /** Collapsed, the banner is itself the button that re-opens it. */
  async expandTrialNotice() {
    await this.trialNotice().click();
    await expect(this.trialNotice()).toHaveAttribute('data-collapsed', 'false');
  }
}
