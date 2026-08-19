import { Locator, Page } from '@playwright/test';

const tracePane = (page: Page) => page.getByTestId('rv2-cf-trace-pane');

export const CashFlowLocators = {
  cashFlowTab: (page: Page) => page.getByRole('tab', { name: 'Cash Flow' }),

  sheet: (page: Page) => page.getByTestId('rv2-sheet-cash-flow'),
  /** The OPERATING CASH FLOW waterfall table. */
  table: (page: Page) => page.getByRole('grid', { name: 'Cash flow waterfall' }),
  columnHeaders: (page: Page) => page.getByRole('grid', { name: 'Cash flow waterfall' }).getByRole('columnheader'),
  /** A waterfall line, e.g. `noi` or `base_rent`. */
  row: (page: Page, rowKey: string) => page.getByTestId(`rv2-cf-row-${rowKey}`),
  rowCell: (row: Locator, columnIndex: number) => row.locator('> td').nth(columnIndex),

  numberFormatButton: (page: Page) => page.getByRole('button', { name: 'Number format' }),
  numberFormatMenu: (page: Page) => page.getByRole('menu'),
  /** Chip that toggles the table between thousands and full dollars. */
  thousandsOption: (page: Page) => page.getByRole('menuitemradio', { name: 'Thousands' }),

  tracePane,
  traceCloseButton: (page: Page) => tracePane(page).getByTestId('rv2-cf-trace-close'),
  /** Sentence-case DOM text of the panel's labels; the UI upper-cases them with CSS. */
  traceLabel: (page: Page, label: string) => tracePane(page).getByText(label, { exact: true }),
  /** Figure that sits next to one of the panel's labels, e.g. `2025 value`. */
  traceFigure: (page: Page, label: string) =>
    tracePane(page).getByText(label, { exact: true }).locator('..').locator('.rv2-num'),
  traceContributors: (page: Page) => tracePane(page).locator('[data-testid^="rv2-cf-trace-contrib-"]'),
  traceContributorAmount: (contributor: Locator) => contributor.locator('.rv2-num'),
  traceRentRollLinks: (page: Page) => tracePane(page).locator('[data-testid^="rv2-cf-trace-link-"]'),
};
