import { Locator, Page, expect } from '@playwright/test';
import { ExpensesLocators } from './ExpensesLocators';
import { parseCurrency } from '../RentRoll/RentRollPage';

export class ExpensesPage {
  readonly page: Page;
  readonly locators = ExpensesLocators;

  constructor(page: Page) {
    this.page = page;
  }

  async gotoFromTabBar() {
    await this.locators.expensesTab(this.page).click();
    await this.locators.grid(this.page).waitFor({ state: 'visible' });
  }

  totalOpexTile() {
    return this.locators.statTile(this.page, 'Total OpEx');
  }

  perSfTile() {
    return this.locators.statTile(this.page, '$/SF');
  }

  reTaxesTile() {
    return this.locators.statTile(this.page, 'RE Taxes');
  }

  expenseRatioTile() {
    return this.locators.statTile(this.page, 'Expense ratio');
  }

  /** Currently displayed Expense ratio, e.g. `57.4%`. */
  async expenseRatio(): Promise<string> {
    return ((await this.expenseRatioTile().textContent()) ?? '').trim();
  }

  /** Every expense line item, excluding the grid header and the grid's Total row. */
  lineItemRows() {
    return this.locators.lineItemRows(this.page);
  }

  async lineItemCount(): Promise<number> {
    return this.lineItemRows().count();
  }

  async lineItemNames(): Promise<string[]> {
    const names = await this.locators.lineItemCell(this.lineItemRows()).allInnerTexts();
    return names.map((name) => name.trim());
  }

  /** Displayed Amount of every line item, in grid order, e.g. `$10,733`. */
  async lineItemAmounts(): Promise<string[]> {
    const amounts = await this.locators.amountCell(this.lineItemRows()).allInnerTexts();
    return amounts.map((amount) => amount.trim());
  }

  /** Sum of every line-item Amount, converted from the displayed currency strings. */
  async lineItemAmountTotal(): Promise<number> {
    const amounts = await this.lineItemAmounts();
    return amounts.reduce((sum, amount) => sum + parseCurrency(amount), 0);
  }

  lineItemRow(lineItem: string) {
    return this.locators.lineItemRow(this.page, lineItem);
  }

  async lineItemAmount(lineItem: string): Promise<string> {
    return ((await this.locators.amountCell(this.lineItemRow(lineItem)).textContent()) ?? '').trim();
  }

  totalRow() {
    return this.locators.totalRow(this.page);
  }

  /** Displayed Amount on the grid's own Total row. */
  async tableTotalAmount(): Promise<string> {
    return ((await this.locators.amountCell(this.totalRow()).textContent()) ?? '').trim();
  }

  /** Displayed $/SF on the grid's own Total row. */
  async tableTotalPerSf(): Promise<string> {
    return ((await this.locators.perSfCell(this.totalRow()).textContent()) ?? '').trim();
  }

  reimbToggle(lineItem: string): Locator {
    return this.locators.reimbToggle(this.lineItemRow(lineItem));
  }

  async isReimbursable(lineItem: string): Promise<boolean> {
    return (await this.reimbToggle(lineItem).getAttribute('aria-checked')) === 'true';
  }

  async toggleReimb(lineItem: string) {
    await this.reimbToggle(lineItem).click();
  }

  /** Puts a line item's Reimb. switch back into the given state, if it is not already there. */
  async setReimbursable(lineItem: string, reimbursable: boolean) {
    if ((await this.isReimbursable(lineItem)) !== reimbursable) {
      await this.toggleReimb(lineItem);
    }
  }

  addLineItemButton() {
    return this.locators.addLineItemButton(this.page);
  }

  deleteRowButton() {
    return this.locators.deleteRowButton(this.page);
  }

  addLineItemDialog() {
    return this.locators.addLineItemDialog(this.page);
  }

  /** Opens the Add line item modal and waits for its blank form. */
  async openAddLineItem() {
    await this.addLineItemButton().click();
    await this.addLineItemDialog().waitFor({ state: 'visible' });
  }

  /**
   * Fills and commits the Add line item modal. Growth and Reimb. are not part of the form;
   * the grid defaults them, so callers set them on the created row.
   */
  async submitNewLineItem(lineItem: string, amount: string) {
    await this.locators.addLineItemNameInput(this.page).fill(lineItem);
    await this.locators.addLineItemAmountInput(this.page).fill(amount);
    await this.locators.addLineItemSubmit(this.page).click();
    await this.addLineItemDialog().waitFor({ state: 'detached' });
  }

  /** Displayed Growth % of a line item, e.g. `3.00%`. */
  async lineItemGrowth(lineItem: string): Promise<string> {
    return ((await this.locators.growthCell(this.lineItemRow(lineItem)).textContent()) ?? '').trim();
  }

  /** Selects a row by clicking its LINE ITEM cell, which is what arms Delete row. */
  async selectLineItem(lineItem: string) {
    await this.locators.lineItemCell(this.lineItemRow(lineItem)).click();
    await expect(this.deleteRowButton()).toBeEnabled();
  }

  /** Clicks Delete row and confirms the modal the app raises. */
  async deleteSelectedRow() {
    await this.deleteRowButton().click();
    await this.locators.deleteRowDialog(this.page).waitFor({ state: 'visible' });
    await this.locators.deleteRowConfirm(this.page).click();
    await this.locators.deleteRowDialog(this.page).waitFor({ state: 'detached' });
  }
}
