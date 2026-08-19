import { Locator, Page } from '@playwright/test';

export const DealsLocators = {
  dealRow: (page: Page, dealName: string) =>
    page.locator('[data-testid^="rv2-deal-row-"]').filter({ hasText: dealName }),
  dealLink: (row: Locator, dealName: string) => row.getByRole('link', { name: `Open deal ${dealName}` }),
  assetTypeCell: (row: Locator) => row.locator('> *').nth(2),
  priceCell: (row: Locator) => row.locator('> *').nth(3),
  irrCell: (row: Locator) => row.locator('> *').nth(4),
  emCell: (row: Locator) => row.locator('> *').nth(5),
  capCell: (row: Locator) => row.locator('> *').nth(6),
  minDscrCell: (row: Locator) => row.locator('> *').nth(7),
  statusCell: (row: Locator) => row.locator('> *').nth(8),
  breadcrumbDeals: (page: Page) => page.getByTestId('rv2-breadcrumb-deals'),
  breadcrumbDealName: (page: Page) => page.getByTestId('rv2-breadcrumb-deal'),
  underwritingSummaryHeading: (page: Page) => page.getByRole('heading', { name: 'Underwriting Summary' }),
};
