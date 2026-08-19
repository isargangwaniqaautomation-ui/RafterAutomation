import { Page } from '@playwright/test';
import { ReimbursementProfilesLocators } from './ReimbursementProfilesLocators';

export class ReimbursementProfilesPage {
  readonly page: Page;
  readonly locators = ReimbursementProfilesLocators;

  constructor(page: Page) {
    this.page = page;
  }

  async gotoFromTabBar() {
    await this.locators.reimbursementTab(this.page).click();
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

  profileHeader(profile: string) {
    return this.locators.profileHeader(this.page, profile);
  }

  /** Profile names in the order their columns are rendered, left to right. */
  async profileNames(): Promise<string[]> {
    const headers = this.locators.profileHeaders(this.page);
    await headers.first().waitFor({ state: 'visible' });
    return headers.evaluateAll((elements) =>
      elements.map((element) => (element.getAttribute('data-testid') ?? '').replace('rv2-reimb-profile-', '')),
    );
  }

  tenantsAssigned(profile: string) {
    return this.locators.tenantsAssigned(this.page, profile);
  }

  async tenantsAssignedCount(profile: string): Promise<number> {
    const value = (await this.tenantsAssigned(profile).innerText()).trim();
    const count = Number(value);
    if (!Number.isInteger(count)) {
      throw new Error(`Unrecognised "Tenants assigned" value for ${profile}: "${value}"`);
    }
    return count;
  }

  /**
   * Clicks `＋ New profile` and returns the name the app gave the created column.
   * The app auto-numbers repeats, so the name is read back from the UI rather than assumed.
   * Creation leaves the new profile's detail panel expanded.
   */
  async createProfile(): Promise<string> {
    const before = await this.profileNames();
    await this.locators.newProfileButton(this.page).click();
    await this.locators.profileHeaders(this.page).nth(before.length).waitFor({ state: 'visible' });

    const after = await this.profileNames();
    const created = after.filter((name) => !before.includes(name));
    if (created.length !== 1) {
      throw new Error(`Expected exactly one new profile, got: [${created.join(', ')}]`);
    }

    await this.detailCard(created[0]).waitFor({ state: 'visible' });
    return created[0];
  }

  detailCard(profile: string) {
    return this.locators.detailCard(this.page, profile);
  }

  /** Expands a profile's detail panel unless it is already open. */
  async openProfileDetails(profile: string) {
    const header = this.profileHeader(profile);
    await header.waitFor({ state: 'visible' });
    if ((await header.getAttribute('aria-expanded')) !== 'true') {
      await header.click();
    }
    await this.detailCard(profile).waitFor({ state: 'visible' });
  }

  typeSelect(profile: string) {
    return this.locators.typeSelect(this.page, profile);
  }

  /** Labels of every option offered by a profile's Type dropdown. */
  async typeOptions(profile: string): Promise<string[]> {
    const options = this.locators.typeOptions(this.typeSelect(profile));
    await options.first().waitFor({ state: 'attached' });
    const labels = await options.allTextContents();
    return labels.map((label) => label.trim());
  }

  /** Label of the option the Type dropdown currently shows, e.g. `Double net`. */
  async selectedType(profile: string): Promise<string> {
    const select = this.typeSelect(profile);
    const value = await select.inputValue();
    return (await this.locators.typeOption(select, value).innerText()).trim();
  }

  async setType(profile: string, typeLabel: string) {
    await this.typeSelect(profile).selectOption({ label: typeLabel });
  }

  /** Clicks `Save profile` and waits for the app to close the detail panel. */
  async saveProfile(profile: string) {
    await this.locators.saveProfileButton(this.page, profile).click();
    await this.detailCard(profile).waitFor({ state: 'detached' });
  }
}
