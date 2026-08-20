import { Locator, Page } from '@playwright/test';

export const DashboardLocators = {
  dashboardTab: (page: Page) => page.getByRole('tab', { name: 'Dashboard' }),

  leveredIrrTile: (page: Page) => page.getByTestId('rv2-hero-lirr'),
  equityMultipleTile: (page: Page) => page.getByTestId('rv2-hero-em'),
  unleveredIrrTile: (page: Page) => page.getByTestId('rv2-hero-uirr'),
  cashOnCashTile: (page: Page) => page.getByTestId('rv2-hero-coc'),
  goingInCapTile: (page: Page) => page.getByTestId('rv2-hero-going_in_cap'),
  goingInCapSubLine: (page: Page) => page.getByTestId('rv2-hero-cap-sub'),
  dscrTile: (page: Page) => page.getByTestId('rv2-hero-dscr_yr1'),
  /** Sub-line under the Yr1 DSCR figure, e.g. `min 1.31x · 2031`. */
  dscrSubLine: (page: Page) => page.getByTestId('rv2-hero-dscr-sub'),
  yr1NoiTile: (page: Page) => page.getByTestId('rv2-tile-yr1_noi'),
  underwritingSummaryHeading: (page: Page) => page.getByRole('heading', { name: 'Underwriting Summary' }),

  /** SOURCES & USES panel. Every row and total carries its own test id. */
  sourcesUses: (page: Page) => page.getByTestId('rv2-sources-uses'),
  susRow: (page: Page, key: string) => page.getByTestId(`rv2-sus-row-${key}`),
  susTotalSources: (page: Page) => page.getByTestId('rv2-sus-total-sources'),
  susTotalUses: (page: Page) => page.getByTestId('rv2-sus-total-uses'),
  susFootnote: (page: Page) => page.getByTestId('rv2-sus-footnote'),
  /** Money figure inside a Sources & Uses row, e.g. `$1,625,000`. */
  susRowValue: (row: Locator) => row.locator('.rv2-sus-value'),
  susTotalValue: (total: Locator) => total.locator('.rv2-sus-total-value'),
  susRowLabel: (row: Locator) => row.locator('.rv2-sus-label'),

  /**
   * Trial banner above the sheet. It renders as an `output` while expanded and swaps to a
   * collapsed pill `button` that carries the same test id.
   */
  trialNotice: (page: Page) => page.getByTestId('rv2-trial-notice'),
  trialUpgradeButton: (page: Page) => page.getByTestId('rv2-trial-notice-cta'),
  trialCollapseButton: (page: Page) => page.getByTestId('rv2-trial-notice-collapse'),
};
