import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { DealsPage } from '../../pages/Deals/DealsPage';
import { DocumentsPage } from '../../pages/Documents/DocumentsPage';

const DEAL_NAME = 'Elm Street Plaza';
const AUTH_STATE = 'utils/googleAuthState.json';

const EMPTY_STATE_MESSAGE =
  'No source documents on this deal yet — deals started without documents (or before document capture was ' +
  'enabled) have none. Upload an updated rent roll above to review its changes against the current model.';
const ACCEPTED_FILE_TYPES = '.xlsx,.xls,.csv,.pdf';

test.describe('Documents', () => {
  test.skip(!fs.existsSync(AUTH_STATE), 'No stored authenticated session (utils/googleAuthState.json)');
  test.use({ storageState: AUTH_STATE });

  test.beforeEach(async ({ page }) => {
    const dealsPage = new DealsPage(page);
    await dealsPage.goto();
    await dealsPage.openDeal(DEAL_NAME);
    await new DocumentsPage(page).gotoFromTabBar();
  });

  test('TC-CUJ-24 - Documents empty state renders and the upload button opens the file chooser', async ({ page }) => {
    const documentsPage = new DocumentsPage(page);

    await expect(documentsPage.heading()).toBeVisible();

    await expect(documentsPage.emptyState()).toBeVisible();
    await expect(documentsPage.emptyState()).toContainText('No source documents on this deal yet');
    await expect(documentsPage.emptyState()).toHaveText(EMPTY_STATE_MESSAGE);

    await expect(documentsPage.auditReportButton()).toBeVisible();
    await expect(documentsPage.uploadButton()).toBeVisible();
    await expect(documentsPage.uploadButton()).toBeEnabled();

    const fileChooser = await documentsPage.openUploadFileChooser();

    // The chooser belongs to the rent roll upload input, and no file is selected.
    expect(fileChooser.isMultiple()).toBe(false);
    expect(await fileChooser.element().getAttribute('accept')).toBe(ACCEPTED_FILE_TYPES);
  });
});
