import { Locator, Page } from '@playwright/test';

export const GeneralLocators = {
  generalTab: (page: Page) => page.getByRole('tab', { name: 'General', exact: true }),

  sheet: (page: Page) => page.getByTestId('rv2-sheet-general'),
  heading: (page: Page) => page.getByRole('heading', { name: 'General Assumptions' }),
  snapshotsLink: (page: Page) => page.getByTestId('rv2-general-open-snapshots'),

  /** Assumption tiles — each holds its label and the displayed value. */
  generalVacancy: (page: Page) => page.getByTestId('rv2-kv-general_vacancy'),
  creditLoss: (page: Page) => page.getByTestId('rv2-kv-credit_loss_pct'),
  expenseInflation: (page: Page) => page.getByTestId('rv2-kv-expense_growth'),
  revenueInflation: (page: Page) => page.getByTestId('rv2-kv-annual_rent_growth'),
  closingCosts: (page: Page) => page.getByTestId('rv2-kv-closing_costs_pct'),
  capitalReserves: (page: Page) => page.getByTestId('rv2-kv-cap_reserves_psf'),

  /** Displayed value inside an assumption tile. */
  fieldValue: (field: Locator) => field.locator('.rv2-num'),
  /** Inline editor a tile turns into when clicked. */
  fieldEditor: (page: Page, label: string) => page.getByLabel(`Edit ${label}`),

  /** Drawer the Snapshots & Scenarios link opens. */
  snapshotsDrawer: (page: Page) => page.getByTestId('rv2-snapshots-drawer'),
  snapshotNameInput: (page: Page) => page.getByTestId('rv2-snapshot-name'),
  snapshotSaveButton: (page: Page) => page.getByTestId('rv2-snapshot-save'),
  /** Shown in place of the snapshot list while the deal has no saved snapshots. */
  snapshotsEmptyState: (page: Page) => page.getByTestId('rv2-snapshots-empty'),
  snapshotsCloseButton: (page: Page) => page.getByTestId('rv2-snapshots-close'),
  /** Per-snapshot control that loads a saved scenario back into the model. */
  snapshotRestoreButtons: (page: Page) =>
    page.getByTestId('rv2-snapshots-drawer').getByRole('button', { name: /restore|load|apply/i }),

  /** Placeholder the drawer shows until its saved snapshots have been fetched. */
  snapshotsLoading: (page: Page) => page.getByTestId('rv2-snapshots-drawer').getByText(/Loading snapshots/i),
};
