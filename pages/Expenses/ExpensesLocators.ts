import { Locator, Page } from '@playwright/test';

const grid = (page: Page) => page.getByRole('grid', { name: 'Expenses grid' });

// Grid columns, in the order the Expenses grid renders them:
// 1 row number (gutter) | 2 Line item | 3 Amount | 4 $/SF | 5 % total | 6 Growth % | 7 Reimb.
// The Total row keeps the same alignment for columns 1-4.
const LINE_ITEM_COLUMN = 2;
const AMOUNT_COLUMN = 3;
const PER_SF_COLUMN = 4;

export const ExpensesLocators = {
  expensesTab: (page: Page) => page.getByTestId('sheet-tab-expenses'),

  sheet: (page: Page) => page.getByTestId('rv2-sheet-expenses'),
  heading: (page: Page) => page.getByRole('heading', { name: 'Expenses & Reimbursement' }),

  statTile: (page: Page, label: string) =>
    page.locator('.rv2-stattile').filter({ hasText: label }).locator('.rv2-num'),

  grid: (page: Page) => grid(page),
  columnHeaders: (page: Page) => grid(page).locator('thead th'),

  /** Every expense line-item row: the grid body rows minus the grid's own Total row. */
  lineItemRows: (page: Page) => grid(page).locator('tbody tr:not(.rv2-grid-totals)'),
  lineItemRow: (page: Page, lineItem: string) =>
    grid(page)
      .locator('tbody tr')
      .filter({ has: page.getByRole('gridcell', { name: lineItem }) }),
  totalRow: (page: Page) => grid(page).locator('tr.rv2-grid-totals'),

  lineItemCell: (rows: Locator) => rows.locator(`td:nth-child(${LINE_ITEM_COLUMN})`),
  amountCell: (rows: Locator) => rows.locator(`td:nth-child(${AMOUNT_COLUMN})`),
  perSfCell: (rows: Locator) => rows.locator(`td:nth-child(${PER_SF_COLUMN})`),
  reimbToggle: (row: Locator) => row.getByRole('switch'),
};
