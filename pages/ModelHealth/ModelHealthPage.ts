import { Page } from '@playwright/test';
import { ModelHealthLocators } from './ModelHealthLocators';

/** Leading integer of a Model Health counter, e.g. `✓125 checks passed` -> 125. */
function parseCount(display: string): number {
  const match = display.replace(/[^\d]/g, ' ').trim().split(/\s+/)[0];
  const count = Number(match);
  if (!Number.isInteger(count)) {
    throw new Error(`Unrecognised Model Health count: "${display}"`);
  }
  return count;
}

export class ModelHealthPage {
  readonly page: Page;
  readonly locators = ModelHealthLocators;

  constructor(page: Page) {
    this.page = page;
  }

  async gotoFromTabBar() {
    await this.locators.modelHealthTab(this.page).click();
    await this.waitForLoaded();
  }

  async waitForLoaded() {
    await this.locators.sheet(this.page).waitFor({ state: 'visible' });
    await this.locators.passedChecks(this.page).waitFor({ state: 'visible' });
    await this.locators.warningCount(this.page).waitFor({ state: 'visible' });
  }

  checkCard(checkId: string) {
    return this.locators.checkCard(this.page, checkId);
  }

  async passedCount(): Promise<number> {
    return parseCount(await this.locators.passedChecks(this.page).innerText());
  }

  async warningCount(): Promise<number> {
    return parseCount(await this.locators.warningCount(this.page).innerText());
  }

  async criticalCount(): Promise<number> {
    return parseCount(await this.locators.criticalCount(this.page).innerText());
  }

  async infoCount(): Promise<number> {
    return parseCount(await this.locators.infoCount(this.page).innerText());
  }

  /** Every summary chip counter, read together after the sheet has rendered. */
  async summaryCounts(): Promise<{ passed: number; criticals: number; warnings: number; info: number }> {
    await this.waitForLoaded();
    return {
      passed: await this.passedCount(),
      criticals: await this.criticalCount(),
      warnings: await this.warningCount(),
      info: await this.infoCount(),
    };
  }

  /** The check card's own inline fix field, e.g. the General vacancy input on `zero-general-vacancy`. */
  checkFixInput(checkId: string) {
    return this.locators.checkFixInput(this.page, checkId);
  }

  checkApplyButton(checkId: string) {
    return this.locators.checkApplyButton(this.page, checkId);
  }

  /** Fills a check card's inline fix field and applies it through that card's own Apply button. */
  async applyCheckFix(checkId: string, value: string) {
    await this.checkFixInput(checkId).fill(value);
    await this.checkApplyButton(checkId).click();
  }

  /** Passed and warning counters read together, after the sheet has rendered. */
  async counts(): Promise<{ passed: number; warnings: number }> {
    await this.waitForLoaded();
    return { passed: await this.passedCount(), warnings: await this.warningCount() };
  }

  aiScanButton() {
    return this.locators.aiScanButton(this.page);
  }

  aiScanError() {
    return this.locators.aiScanError(this.page);
  }

  checkCards() {
    return this.locators.checkCards(this.page);
  }

  /** Test id of every finding card currently on the sheet. */
  async checkCardIds(): Promise<string[]> {
    return this.checkCards().evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('data-testid') ?? ''),
    );
  }

  /** True while the scan button reports itself busy or disabled, i.e. a scan is running. */
  async isScanning(): Promise<boolean> {
    const button = this.aiScanButton();
    const busy = await button.getAttribute('aria-busy');
    return busy === 'true' || !(await button.isEnabled());
  }

  async startAiScan() {
    await this.aiScanButton().click();
  }
}
