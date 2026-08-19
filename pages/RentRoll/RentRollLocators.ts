import { Locator, Page } from '@playwright/test';

const cashFlowPanel = (page: Page) => page.getByRole('dialog', { name: 'Tenant cash flow drilldown' });

export const RentRollLocators = {
  rentRollTab: (page: Page) => page.getByRole('tab', { name: 'Rent Roll' }),
  dashboardTab: (page: Page) => page.getByRole('tab', { name: 'Dashboard' }),
  marketLeasingTab: (page: Page) => page.getByRole('tab', { name: 'Market Leasing' }),

  contentPane: (page: Page) => page.getByTestId('rv2-content-pane'),

  statTile: (page: Page, label: string) =>
    page.locator('.rv2-stattile').filter({ hasText: label }).locator('.rv2-num'),

  kpiLeveredIrr: (page: Page) => page.getByTestId('rv2-metric-lirr'),
  kpiEquityMultiple: (page: Page) => page.getByTestId('rv2-metric-equity_multiple'),
  kpiPrice: (page: Page) => page.getByTestId('rv2-metric-purchase_price'),
  kpiGoingInCap: (page: Page) => page.getByTestId('rv2-metric-going_in_cap'),
  kpiMinDscr: (page: Page) => page.getByTestId('rv2-metric-dscr_yr1'),
  kpiCashOnCash: (page: Page) => page.getByTestId('rv2-metric-cash_on_cash'),

  grid: (page: Page) => page.getByRole('grid', { name: 'Rent roll grid' }),
  gridColumnHeaders: (page: Page) =>
    page.getByRole('grid', { name: 'Rent roll grid' }).getByRole('columnheader'),
  /** Rows that describe a tenant — the vacancy and total rows carry no tenant button. */
  tenantRows: (page: Page) =>
    page
      .getByRole('grid', { name: 'Rent roll grid' })
      .getByRole('row')
      .filter({ has: page.getByRole('gridcell') })
      .filter({ has: page.getByRole('button') }),
  gridCell: (row: Locator, columnIndex: number) => row.locator('> td').nth(columnIndex),
  /** Displayed value of a dropdown-backed grid cell, without its caret. */
  gridCellSelectValue: (cell: Locator) => cell.locator('.rv2-grid-cellval'),
  gridDataAndTotalRows: (page: Page) =>
    page.getByRole('grid', { name: 'Rent roll grid' }).getByRole('row').filter({ has: page.getByRole('gridcell') }),

  tenantButton: (page: Page, tenantName: string) => page.getByRole('button', { name: tenantName }),
  tenantRow: (page: Page, tenantName: string) =>
    page.getByRole('row').filter({ has: page.getByRole('button', { name: tenantName }) }),

  rolloverPanel: (page: Page) => page.getByTestId('rv2-rollover-editor'),
  contractualSection: (page: Page) => page.getByTestId('rv2-roll-contractual'),
  marketSection: (page: Page) => page.getByTestId('rv2-roll-market'),

  exerciseProbabilityInput: (page: Page) => page.getByTestId('rv2-roll-option_renewal_probability'),
  renewalRateInput: (page: Page) => page.getByTestId('rv2-roll-option_rent_psf'),
  contractualTermInput: (page: Page) => page.getByTestId('rv2-roll-option_term_years'),
  contractualTiInput: (page: Page) => page.getByTestId('rv2-roll-option_ti_psf'),
  contractualDowntimeInput: (page: Page) => page.getByTestId('rv2-roll-downtime_months_renewal'),

  renewalProbabilityInput: (page: Page) => page.getByTestId('rv2-roll-renewal_probability'),
  marketRentPsfInput: (page: Page) => page.getByTestId('rv2-roll-tenant_market_rent_psf'),
  marketTermInput: (page: Page) => page.getByTestId('rv2-roll-lease_term_years'),
  tiNewInput: (page: Page) => page.getByTestId('rv2-roll-ti_new_psf'),
  marketDowntimeInput: (page: Page) => page.getByTestId('rv2-roll-downtime_months'),

  tenantCashFlowLink: (page: Page) => page.getByTestId('rv2-roll-cashflow'),
  cashFlowPanel: (page: Page) => cashFlowPanel(page),
  cashFlowPanelHeader: (page: Page) => cashFlowPanel(page).locator('header'),
  cashFlowPanelTitle: (page: Page) => cashFlowPanel(page).getByRole('heading', { level: 2 }),
  cashFlowTable: (page: Page) => cashFlowPanel(page).getByRole('table'),
  cashFlowColumnHeaders: (page: Page) => cashFlowPanel(page).getByRole('table').getByRole('columnheader'),
  cashFlowYearRow: (page: Page, year: number) =>
    cashFlowPanel(page).getByRole('table').getByRole('row').filter({ hasText: new RegExp(`^${year}\\D`) }),
  cashFlowAnnualRows: (page: Page) =>
    cashFlowPanel(page).getByRole('table').getByRole('row').filter({ hasText: /^\d{4}\D/ }),
  cashFlowTotalRow: (page: Page, label: string) =>
    cashFlowPanel(page).getByRole('table').getByRole('row').filter({ hasText: label }),
  cashFlowCloseButton: (page: Page) =>
    cashFlowPanel(page).getByRole('button', { name: 'Close cash flow drilldown' }),
};
