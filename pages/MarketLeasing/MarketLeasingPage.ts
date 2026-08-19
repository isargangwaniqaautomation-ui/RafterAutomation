import { Page } from '@playwright/test';
import { MarketLeasingLocators } from './MarketLeasingLocators';

export class MarketLeasingPage {
  readonly page: Page;
  readonly locators = MarketLeasingLocators;

  constructor(page: Page) {
    this.page = page;
  }

  async gotoFromTabBar() {
    await this.locators.marketLeasingTab(this.page).click();
    await this.page.waitForLoadState('networkidle');
    await this.waitForLoaded();
  }

  async waitForLoaded() {
    await this.locators.heading(this.page).waitFor({ state: 'visible' });
    await this.locators.profileHeaders(this.page).first().waitFor({ state: 'visible' });
  }

  async reload() {
    await this.page.reload();
    await this.page.waitForLoadState('networkidle');
    await this.waitForLoaded();
  }

  heading() {
    return this.locators.heading(this.page);
  }

  newProfileButton() {
    return this.locators.newProfileButton(this.page);
  }

  profileHeader(profile: string) {
    return this.locators.profileHeader(this.page, profile);
  }

  profileName(profile: string) {
    return this.locators.profileName(this.profileHeader(profile));
  }

  profileSubLabel(profile: string) {
    return this.locators.profileSubLabel(this.profileHeader(profile));
  }

  /** Profile names in the order their columns are rendered, left to right. */
  async profileNames(): Promise<string[]> {
    const headers = this.locators.profileHeaders(this.page);
    await headers.first().waitFor({ state: 'visible' });
    return headers.evaluateAll((elements) =>
      elements.map((element) => (element.getAttribute('data-testid') ?? '').replace('rv2-mla-profile-', '')),
    );
  }

  /**
   * Clicks `＋ New profile` and returns the name the app gave the created column.
   * The app auto-numbers repeats (`New profile`, `New profile 2`, …), so the name is read
   * back from the UI rather than assumed.
   */
  async createProfile(): Promise<string> {
    const before = await this.profileNames();
    await this.newProfileButton().click();
    await this.locators.profileHeaders(this.page).nth(before.length).waitFor({ state: 'visible' });

    const after = await this.profileNames();
    const created = after.filter((name) => !before.includes(name));
    if (created.length !== 1) {
      throw new Error(`Expected exactly one new profile, got: [${created.join(', ')}]`);
    }
    return created[0];
  }

  renewalProbabilityCell(profile: string) {
    return this.locators.renewalProbabilityCell(this.page, profile);
  }

  /** Opens the inline editor, types the percentage (without `%`) and commits it with Tab. */
  async setRenewalProbability(profile: string, percent: string) {
    await this.renewalProbabilityCell(profile).click();
    const editor = this.locators.renewalProbabilityEditor(this.page, profile);
    await editor.waitFor({ state: 'visible' });
    await editor.fill(percent);
    await editor.press('Tab');
    await editor.waitFor({ state: 'detached' });
  }
}
