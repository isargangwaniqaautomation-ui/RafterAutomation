import { Page } from '@playwright/test';

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
};
