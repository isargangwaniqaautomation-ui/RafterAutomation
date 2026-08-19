import { Page } from '@playwright/test';
import { DealsLocators } from './DealsLocators';

export class DealsPage {
  readonly page: Page;
  readonly locators = DealsLocators;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/deals');
    await this.page.waitForLoadState('networkidle');
  }

  dealRow(dealName: string) {
    return this.locators.dealRow(this.page, dealName);
  }

  async openDeal(dealName: string) {
    const row = this.dealRow(dealName);
    await this.locators.dealLink(row, dealName).click();
    await this.page.waitForLoadState('networkidle');
  }

  summaryCells(dealName: string) {
    const row = this.dealRow(dealName);
    return {
      assetType: this.locators.assetTypeCell(row),
      price: this.locators.priceCell(row),
      irr: this.locators.irrCell(row),
      em: this.locators.emCell(row),
      cap: this.locators.capCell(row),
      minDscr: this.locators.minDscrCell(row),
      status: this.locators.statusCell(row),
    };
  }

  breadcrumbDealsLink() {
    return this.locators.breadcrumbDeals(this.page);
  }

  breadcrumbDealName() {
    return this.locators.breadcrumbDealName(this.page);
  }

  underwritingSummaryHeading() {
    return this.locators.underwritingSummaryHeading(this.page);
  }
}
