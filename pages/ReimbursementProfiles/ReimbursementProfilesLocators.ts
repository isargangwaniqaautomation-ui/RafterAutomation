import { Locator, Page } from '@playwright/test';

export const ReimbursementProfilesLocators = {
  reimbursementTab: (page: Page) => page.getByRole('tab', { name: 'Reimbursement Profiles' }),

  sheet: (page: Page) => page.getByTestId('rv2-sheet-reimbursement'),
  heading: (page: Page) => page.getByRole('heading', { name: 'Reimbursement Profiles' }),
  newProfileButton: (page: Page) => page.getByTestId('rv2-reimb-new'),

  /** Every profile column header, in left-to-right column order. */
  profileHeaders: (page: Page) => page.locator('[data-testid^="rv2-reimb-profile-"]'),
  profileHeader: (page: Page, profile: string) => page.getByTestId(`rv2-reimb-profile-${profile}`),

  /** `Tenants assigned` row value for a profile column. */
  tenantsAssigned: (page: Page, profile: string) => page.getByTestId(`rv2-reimb-tcount-${profile}`),

  /** `Type` row control for a profile column — a native <select>. */
  typeSelect: (page: Page, profile: string) => page.getByTestId(`rv2-reimb-type-${profile}`),
  typeOptions: (select: Locator) => select.locator('option'),
  typeOption: (select: Locator, value: string) => select.locator(`option[value="${value}"]`),

  /** Expanded detail panel of a profile, which holds the Save profile button. */
  detailCard: (page: Page, profile: string) => page.getByTestId(`rv2-reimb-card-${profile}`),
  saveProfileButton: (page: Page, profile: string) => page.getByTestId(`rv2-reimb-save-${profile}`),
};
