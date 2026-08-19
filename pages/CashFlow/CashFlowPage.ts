import { Locator, Page } from '@playwright/test';
import { CashFlowLocators } from './CashFlowLocators';

export class CashFlowPage {
  readonly page: Page;
  readonly locators = CashFlowLocators;

  constructor(page: Page) {
    this.page = page;
  }

  async gotoFromTabBar() {
    await this.locators.cashFlowTab(this.page).click();
    await this.page.waitForLoadState('networkidle');
    await this.waitForLoaded();
  }

  async waitForLoaded() {
    await this.locators.table(this.page).waitFor({ state: 'visible' });
    await this.locators.row(this.page, 'noi').waitFor({ state: 'visible' });
  }

  /** Position of a year column, read from the rendered header row. */
  async yearColumnIndex(year: number): Promise<number> {
    const headers = this.locators.columnHeaders(this.page);
    await headers.first().waitFor({ state: 'visible' });
    const names = (await headers.allInnerTexts()).map((name) => name.trim());
    const index = names.indexOf(String(year));
    if (index === -1) {
      throw new Error(`Cash flow year "${year}" not found. Columns: ${names.join(' | ')}`);
    }
    return index;
  }

  async cell(rowKey: string, year: number): Promise<Locator> {
    const columnIndex = await this.yearColumnIndex(year);
    return this.locators.rowCell(this.locators.row(this.page, rowKey), columnIndex);
  }

  /** Displayed value of one cell, e.g. `$138K` or `$138,310`. */
  async cellValue(rowKey: string, year: number): Promise<string> {
    return (await (await this.cell(rowKey, year)).innerText()).trim();
  }

  /** Clicks a cell and waits for its Source panel. */
  async openCellSource(rowKey: string, year: number) {
    await (await this.cell(rowKey, year)).click();
    await this.locators.tracePane(this.page).waitFor({ state: 'visible' });
  }

  /** Current display format, as the toolbar renders it: `$ · K` or `$ · Full`. */
  async numberFormat(): Promise<string> {
    const label = await this.locators.numberFormatButton(this.page).innerText();
    return label.replace('▾', '').trim();
  }

  /**
   * Switches the table between thousands (`$ · K`) and full dollars (`$ · Full`).
   * The menu offers a single Thousands chip that toggles between the two.
   */
  async setNumberFormat(format: 'K' | 'Full') {
    const target = `$ · ${format}`;
    if ((await this.numberFormat()) === target) {
      return;
    }

    await this.locators.numberFormatButton(this.page).click();
    await this.locators.numberFormatMenu(this.page).waitFor({ state: 'visible' });
    await this.locators.thousandsOption(this.page).click();
    await this.locators.numberFormatMenu(this.page).waitFor({ state: 'detached' });
  }

  sourcePanel() {
    return this.locators.tracePane(this.page);
  }

  sourceLabel() {
    return this.locators.traceLabel(this.page, 'Source');
  }

  /** Panel subtitle, e.g. `Base Rental Revenue · 2025`. */
  sourceTitle(rowLabel: string, year: number) {
    return this.locators.traceLabel(this.page, `${rowLabel} · ${year}`);
  }

  contributingTenantsLabel() {
    return this.locators.traceLabel(this.page, 'Contributing tenants');
  }

  /** Headline `<year> VALUE` figure of the Source panel. */
  sourceValue(year: number) {
    return this.locators.traceFigure(this.page, `${year} value`);
  }

  sumOfTenants() {
    return this.locators.traceFigure(this.page, 'Sum of tenants');
  }

  rentRollLinks() {
    return this.locators.traceRentRollLinks(this.page);
  }

  /** Displayed amount of every row under CONTRIBUTING TENANTS, in panel order. */
  async contributingTenantAmounts(): Promise<string[]> {
    const contributors = this.locators.traceContributors(this.page);
    await contributors.first().waitFor({ state: 'visible' });

    const amounts: string[] = [];
    for (let index = 0; index < (await contributors.count()); index++) {
      amounts.push((await this.locators.traceContributorAmount(contributors.nth(index)).innerText()).trim());
    }
    return amounts;
  }

  async closeSource() {
    await this.locators.traceCloseButton(this.page).click();
    await this.locators.tracePane(this.page).waitFor({ state: 'detached' });
  }
}
