import { FileChooser, Page } from '@playwright/test';
import { DocumentsLocators } from './DocumentsLocators';

export class DocumentsPage {
  readonly page: Page;
  readonly locators = DocumentsLocators;

  constructor(page: Page) {
    this.page = page;
  }

  async gotoFromTabBar() {
    await this.locators.documentsTab(this.page).click();
    await this.waitForLoaded();
  }

  async waitForLoaded() {
    await this.locators.heading(this.page).waitFor({ state: 'visible' });
    await this.locators.uploadButton(this.page).waitFor({ state: 'visible' });
  }

  heading() {
    return this.locators.heading(this.page);
  }

  emptyState() {
    return this.locators.emptyState(this.page);
  }

  auditReportButton() {
    return this.locators.auditReportButton(this.page);
  }

  uploadButton() {
    return this.locators.uploadButton(this.page);
  }

  fileInput() {
    return this.locators.fileInput(this.page);
  }

  /** Clicks `Upload updated rent roll` and returns the file chooser the app opens. No file is chosen. */
  async openUploadFileChooser(): Promise<FileChooser> {
    const fileChooser = this.page.waitForEvent('filechooser');
    await this.uploadButton().click();
    return fileChooser;
  }
}
