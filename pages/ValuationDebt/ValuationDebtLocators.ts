import { Locator, Page } from '@playwright/test';

const card = (page: Page, title: string) => page.locator('.rv2-card').filter({ hasText: title }).first();

export const ValuationDebtLocators = {
  valuationDebtTab: (page: Page) => page.getByTestId('sheet-tab-valuation-debt'),
  dashboardTab: (page: Page) => page.getByTestId('sheet-tab-dashboard'),

  sheet: (page: Page) => page.getByTestId('rv2-sheet-valuation-debt'),
  heading: (page: Page) => page.getByRole('heading', { name: 'Valuation & Debt' }),

  /** Sticky KPI header above the sheets. */
  returnsBar: (page: Page) => page.getByTestId('rv2-returns-bar'),
  priceMetric: (page: Page) => page.getByTestId('rv2-metric-purchase_price'),
  /** The KPI numbers are rendered as per-digit flip animations; `.sr-only` carries the plain value. */
  metricValue: (metric: Locator) => metric.locator('.sr-only'),
  /** Unlevered IRR lives on the Dashboard hero, not in the sticky KPI header. */
  heroUnleveredIrr: (page: Page) => page.getByTestId('rv2-hero-uirr'),

  holdAndExitCard: (page: Page) => card(page, 'Hold & Exit'),
  debtAndLoanTermsCard: (page: Page) => card(page, 'Debt & Loan Terms'),

  /** Click-to-edit input fields; each renders a caption label plus a `.rv2-num` value. */
  purchasePriceField: (page: Page) => page.getByTestId('rv2-kv-purchase_price'),
  ltvField: (page: Page) => page.getByTestId('rv2-kv-ltv'),
  interestRateField: (page: Page) => page.getByTestId('rv2-kv-interest_rate'),
  amortizationField: (page: Page) => page.getByTestId('rv2-kv-amort_years'),
  fieldLabel: (field: Locator) => field.locator('> span').first(),
  fieldValue: (field: Locator) => field.locator('.rv2-num'),
  fieldEditor: (page: Page, label: string) => page.getByRole('textbox', { name: `Edit ${label}` }),

  solveCard: (page: Page) => page.getByTestId('rv2-vd-solve-card'),
  solveMetricSelect: (page: Page) => page.getByTestId('rv2-vd-solve-metric'),
  solveTargetInput: (page: Page) => page.getByTestId('rv2-vd-solve-target'),
  solveLeverSelect: (page: Page) => page.getByTestId('rv2-vd-solve-lever'),
  solveButton: (page: Page) => page.getByTestId('rv2-vd-solve-run'),
  solveNote: (page: Page) => page.getByTestId('rv2-vd-solve-note'),
  /** A solved target is pinned to the returns bar and keeps re-solving until it is unpinned. */
  solveUnpinButton: (page: Page) => page.getByTestId('rv2-solve-unpin'),
};
