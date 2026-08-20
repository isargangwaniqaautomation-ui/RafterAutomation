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

  /** Section that carries the read-only outputs the sheet closes with, including the DSCR chart. */
  outputsInContextLabel: (page: Page) =>
    page.getByTestId('rv2-sheet-cash-flow').getByText('Outputs in Context', { exact: false }),

  exportButton: (page: Page) =>
    page.getByTestId('rv2-sheet-cash-flow').getByRole('button', { name: 'Export CSV' }),

  /** DSCR-over-hold chart. Plain DOM bars - no SVG or canvas involved. */
  dscrChart: (page: Page) => page.getByTestId('rv2-cf-dscr-chart'),
  /** Covenant reference the chart header carries, e.g. `cov. 1.25x`. */
  dscrCovenantLabel: (page: Page) => page.getByTestId('rv2-cf-dscr-chart').getByText(/^cov\./),
  dscrBars: (page: Page) => page.locator('[data-testid^="rv2-cf-dscr-bar-"]'),
  dscrBar: (page: Page, year: number) => page.getByTestId(`rv2-cf-dscr-bar-${year}`),
  /** A bar renders its DSCR above the column and the short year below it. */
  dscrBarValue: (bar: Locator) => bar.locator('.rv2-num'),
  dscrBarYear: (bar: Locator) => bar.locator('> span').last(),
  /** The coloured column itself; `data-dscr-color` carries the status the app assigned it. */
  dscrBarFill: (bar: Locator) => bar.locator('[data-dscr-color]'),

  /** Sticky KPI header tile that reports the hold-period minimum DSCR, e.g. `1.31x`. */
  minDscrMetric: (page: Page) => page.getByTestId('rv2-metric-dscr_yr1'),
  metricValue: (metric: Locator) => metric.locator('.sr-only'),
};
