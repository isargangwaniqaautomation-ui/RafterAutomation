import { Page } from '@playwright/test';

export const DocumentsLocators = {
  documentsTab: (page: Page) => page.getByRole('tab', { name: 'Documents' }),

  heading: (page: Page) => page.getByRole('heading', { name: 'Documents' }),
  emptyState: (page: Page) => page.getByTestId('rv2-docs-empty'),
  auditReportButton: (page: Page) => page.getByTestId('rv2-docs-audit-report'),
  uploadButton: (page: Page) => page.getByTestId('rv2-docs-upload'),
  /** Hidden input the upload button opens; identified by its accessible name. */
  fileInput: (page: Page) => page.getByLabel('Choose an updated document to stage'),
};
