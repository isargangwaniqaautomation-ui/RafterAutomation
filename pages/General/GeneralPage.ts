import { Locator, Page } from '@playwright/test';
import { GeneralLocators } from './GeneralLocators';

export class GeneralPage {
  readonly page: Page;
  readonly locators = GeneralLocators;

  constructor(page: Page) {
    this.page = page;
  }

  async gotoFromTabBar() {
    await this.locators.generalTab(this.page).click();
    await this.page.waitForLoadState('networkidle');
    await this.waitForLoaded();
  }

  async waitForLoaded() {
    await this.locators.heading(this.page).waitFor({ state: 'visible' });
    await this.locators.generalVacancy(this.page).waitFor({ state: 'visible' });
  }

  heading() {
    return this.locators.heading(this.page);
  }

  snapshotsLink() {
    return this.locators.snapshotsLink(this.page);
  }

  /** The six deal-wide assumption tiles, keyed by the label the sheet renders. */
  fields(): Record<string, Locator> {
    return {
      'General Vacancy': this.locators.generalVacancy(this.page),
      'Credit Loss': this.locators.creditLoss(this.page),
      'Expense Inflation': this.locators.expenseInflation(this.page),
      'Revenue Inflation': this.locators.revenueInflation(this.page),
      'Closing Costs': this.locators.closingCosts(this.page),
      'Capital Reserves': this.locators.capitalReserves(this.page),
    };
  }

  fieldValue(label: string) {
    const field = this.fields()[label];
    if (!field) {
      throw new Error(`Unknown General Assumptions field: "${label}"`);
    }
    return this.locators.fieldValue(field);
  }

  /**
   * Opens a tile's inline editor, types the new value and commits it with Tab.
   * Values are typed the way the editor holds them, i.e. `5.00` for `5.00%`.
   */
  async setFieldValue(label: string, value: string) {
    const field = this.fields()[label];
    if (!field) {
      throw new Error(`Unknown General Assumptions field: "${label}"`);
    }

    await field.click();
    const editor = this.locators.fieldEditor(this.page, label);
    await editor.waitFor({ state: 'visible' });
    await editor.fill(value);
    await editor.press('Tab');
    await editor.waitFor({ state: 'detached' });
  }
}
