import { Locator, Page } from '@playwright/test';

export const MarketLeasingLocators = {
  marketLeasingTab: (page: Page) => page.getByRole('tab', { name: 'Market Leasing' }),

  sheet: (page: Page) => page.getByTestId('rv2-sheet-market-leasing'),
  heading: (page: Page) => page.getByTestId('rv2-mla-title'),
  newProfileButton: (page: Page) => page.getByTestId('rv2-mla-new'),

  /** Every profile column header, in left-to-right column order. */
  profileHeaders: (page: Page) => page.locator('[data-testid^="rv2-mla-profile-"]'),
  profileHeader: (page: Page, profile: string) => page.getByTestId(`rv2-mla-profile-${profile}`),
  /** Bold profile name inside a column header. */
  profileName: (header: Locator) => header.locator('> span').first().locator('> span').first(),
  /** Tenant-count / SF caption under the profile name, e.g. `3 · 6,902 SF` or `0 tenants`. */
  profileSubLabel: (header: Locator) => header.locator('> span').nth(1),

  renewalProbabilityCell: (page: Page, profile: string) =>
    page.getByTestId(`rv2-mla-cell-renewal_probability-${profile}`),
  renewalProbabilityEditor: (page: Page, profile: string) =>
    page.getByTestId(`rv2-mla-edit-renewal_probability-${profile}`),
};
