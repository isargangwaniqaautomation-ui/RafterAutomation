import { Page } from '@playwright/test';

export const ModelHealthLocators = {
  modelHealthTab: (page: Page) => page.getByRole('tab', { name: 'Model Health' }),

  sheet: (page: Page) => page.getByTestId('rv2-sheet-model-health'),
  passedChecks: (page: Page) => page.getByTestId('rv2-health-passed'),
  criticalCount: (page: Page) => page.getByTestId('rv2-health-count-critical'),
  warningCount: (page: Page) => page.getByTestId('rv2-health-count-warning'),
  infoCount: (page: Page) => page.getByTestId('rv2-health-count-info'),

  warningSection: (page: Page) => page.getByTestId('rv2-health-section-warning'),
  /** A single check card, e.g. `zero-general-vacancy` for `General vacancy is 0%`. */
  checkCard: (page: Page, checkId: string) => page.getByTestId(`rv2-check-${checkId}`),

  /** Inline remediation controls, scoped to their own check card - several cards carry an Apply button. */
  checkFixInput: (page: Page, checkId: string) => page.getByTestId(`rv2-check-input-${checkId}`),
  checkFixLabel: (page: Page, checkId: string) => page.locator(`label[for="rv2-check-input-${checkId}"]`),
  checkApplyButton: (page: Page, checkId: string) => page.getByTestId(`rv2-check-apply-${checkId}`),

  aiScanButton: (page: Page) => page.getByTestId('rv2-health-scan'),
  /** Notice the sheet renders when the scan request is refused, e.g. once the AI quota is spent. */
  aiScanError: (page: Page) => page.getByTestId('rv2-health-scan-error'),
  /** Every finding card, excluding the inline fix controls that share the `rv2-check-` prefix. */
  checkCards: (page: Page) =>
    page.locator(
      '[data-testid^="rv2-check-"]:not([data-testid^="rv2-check-input-"]):not([data-testid^="rv2-check-apply-"]):not([data-testid^="rv2-check-fix-"])',
    ),
};
