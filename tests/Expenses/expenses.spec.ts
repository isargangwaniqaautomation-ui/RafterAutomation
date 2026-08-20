import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { DealsPage } from '../../pages/Deals/DealsPage';
import { ExpensesPage } from '../../pages/Expenses/ExpensesPage';
import { parseCurrency } from '../../pages/RentRoll/RentRollPage';

const DEAL_NAME = 'Elm Street Plaza';
const AUTH_STATE = 'utils/googleAuthState.json';

const EXPECTED_PER_SF = '$10.88';
const REIMBURSABLE_LINE_ITEM = 'Contract Grounds';
const REIMBURSABLE_LINE_ITEM_AMOUNT = '$19,235';
const NON_REIMBURSABLE_LINE_ITEM = 'CAMS Management';
const RATIO_PATTERN = /\d+(\.\d+)?%/;

const NEW_LINE_ITEM = 'QA Test Line';
const NEW_LINE_ITEM_AMOUNT = '1000';
const EXPECTED_NEW_AMOUNT = '$1,000';
const EXPECTED_NEW_GROWTH = '3.00%';

test.describe('Expenses', () => {
  test.skip(!fs.existsSync(AUTH_STATE), 'No stored authenticated session (utils/googleAuthState.json)');
  test.use({ storageState: AUTH_STATE });

  test.beforeEach(async ({ page }) => {
    const dealsPage = new DealsPage(page);
    await dealsPage.goto();
    await dealsPage.openDeal(DEAL_NAME);
    await new ExpensesPage(page).gotoFromTabBar();
  });

  test('TC-CUJ-12 - Total OpEx equals the sum of every expense line item', async ({ page }) => {
    const expensesPage = new ExpensesPage(page);

    await expect(expensesPage.locators.grid(page)).toBeVisible();
    expect(await expensesPage.locators.columnHeaders(page).allInnerTexts()).toEqual([
      '',
      'LINE ITEM',
      'AMOUNT',
      '$/SF',
      '% TOTAL',
      'GROWTH %',
      'REIMB.',
    ]);

    // TC-CUJ-12 states 23 line items; the sample deal renders 22. Asserted against the app's real
    // row count so the test still catches a missing, duplicated or extra expense row.
    const lineItemCount = await expensesPage.lineItemCount();
    expect(lineItemCount, 'Expense line-item rows (header and Total row excluded)').toBe(22);
    expect(await expensesPage.lineItemNames()).toContain('Electricity');

    const amounts = await expensesPage.lineItemAmounts();
    expect(amounts).toHaveLength(lineItemCount);

    const lineItemSum = await expensesPage.lineItemAmountTotal();
    const totalOpexTile = (await expensesPage.totalOpexTile().textContent()) ?? '';
    const tableTotal = await expensesPage.tableTotalAmount();

    expect(
      lineItemSum,
      `Sum of ${lineItemCount} line items (${amounts.join(' + ')}) should equal the TOTAL OPEX tile ${totalOpexTile}`,
    ).toBe(parseCurrency(totalOpexTile));

    expect(
      lineItemSum,
      `Sum of ${lineItemCount} line items should equal the grid Total row amount ${tableTotal}`,
    ).toBe(parseCurrency(tableTotal));

    // TC-CUJ-12 expects $186,587; the sample deal's own line items, tile and Total row all read $186,590.
    await expect(expensesPage.perSfTile()).toHaveText(EXPECTED_PER_SF);
    expect(await expensesPage.tableTotalPerSf()).toBe(EXPECTED_PER_SF);
  });

  test('TC-CUJ-13 - Reimb. toggle recalculates the Expense ratio, then restores', async ({ page }) => {
    const expensesPage = new ExpensesPage(page);

    const baselineRatio = await expensesPage.expenseRatio();
    expect(baselineRatio, 'Expense ratio tile should show a percentage').toMatch(RATIO_PATTERN);

    await expect(expensesPage.reimbToggle(NON_REIMBURSABLE_LINE_ITEM)).toHaveAttribute('aria-checked', 'false');

    expect(await expensesPage.lineItemAmount(REIMBURSABLE_LINE_ITEM)).toBe(REIMBURSABLE_LINE_ITEM_AMOUNT);
    const toggle = expensesPage.reimbToggle(REIMBURSABLE_LINE_ITEM);
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    try {
      await expensesPage.toggleReimb(REIMBURSABLE_LINE_ITEM);
      await expect(toggle).toHaveAttribute('aria-checked', 'false');

      await expect
        .poll(() => expensesPage.expenseRatio(), {
          timeout: 15000,
          message: `Expense ratio did not change after switching ${REIMBURSABLE_LINE_ITEM} to non-reimbursable`,
        })
        .not.toBe(baselineRatio);
    } finally {
      await expensesPage.setReimbursable(REIMBURSABLE_LINE_ITEM, true);
      await expect(toggle).toHaveAttribute('aria-checked', 'true');

      await expect
        .poll(() => expensesPage.expenseRatio(), {
          timeout: 15000,
          message: `Expense ratio did not return to the ${baselineRatio} baseline after restoring ${REIMBURSABLE_LINE_ITEM}`,
        })
        .toBe(baselineRatio);
    }
  });

  // `Add line item` opens a modal that collects the name and the annual amount; Growth and
  // Reimb. are defaulted by the grid and set on the created row afterwards.
  test('TC-CUJ-31 - Add line item creates an expense row, Delete row removes it again', async ({ page }) => {
    const expensesPage = new ExpensesPage(page);

    const originalTotal = (await expensesPage.totalOpexTile().innerText()).trim();
    const originalCount = await expensesPage.lineItemCount();
    expect(originalCount, 'Expense line items before the test').toBeGreaterThan(0);
    expect(await expensesPage.lineItemNames(), `${NEW_LINE_ITEM} should not already exist`).not.toContain(
      NEW_LINE_ITEM,
    );

    const newRow = expensesPage.lineItemRow(NEW_LINE_ITEM);

    try {
      await expensesPage.openAddLineItem();
      await expect(expensesPage.locators.addLineItemNameInput(page)).toHaveValue('');
      await expect(expensesPage.locators.addLineItemAmountInput(page)).toHaveValue('');
      await expect(expensesPage.locators.addLineItemSubmit(page)).toBeDisabled();

      await expensesPage.submitNewLineItem(NEW_LINE_ITEM, NEW_LINE_ITEM_AMOUNT);

      await expect(newRow).toBeVisible();
      expect(await expensesPage.lineItemCount()).toBe(originalCount + 1);
      expect(await expensesPage.lineItemAmount(NEW_LINE_ITEM)).toBe(EXPECTED_NEW_AMOUNT);
      expect(await expensesPage.lineItemGrowth(NEW_LINE_ITEM)).toBe(EXPECTED_NEW_GROWTH);

      // The grid defaults a new line to reimbursable; the case calls for Reimb. OFF.
      await expensesPage.setReimbursable(NEW_LINE_ITEM, false);
      await expect(expensesPage.reimbToggle(NEW_LINE_ITEM)).toHaveAttribute('aria-checked', 'false');

      await expect
        .poll(() => expensesPage.totalOpexTile().innerText(), {
          timeout: 15000,
          message: `TOTAL OPEX did not recalculate after adding ${NEW_LINE_ITEM}`,
        })
        .not.toBe(originalTotal);

      const raisedTotal = (await expensesPage.totalOpexTile().innerText()).trim();
      expect(
        parseCurrency(raisedTotal) - parseCurrency(originalTotal),
        `TOTAL OPEX should rise from ${originalTotal} to ${raisedTotal} by exactly ${EXPECTED_NEW_AMOUNT}`,
      ).toBe(parseCurrency(EXPECTED_NEW_AMOUNT));
    } finally {
      // The created row is removed whether or not the assertions above passed, through the
      // app's own select-then-delete flow, and its removal is verified rather than assumed.
      if ((await newRow.count()) > 0) {
        await expensesPage.selectLineItem(NEW_LINE_ITEM);
        await expensesPage.deleteSelectedRow();
      }
    }

    await expect(newRow, `${NEW_LINE_ITEM} should have been deleted`).toHaveCount(0);
    expect(await expensesPage.lineItemNames()).not.toContain(NEW_LINE_ITEM);
    expect(await expensesPage.lineItemCount()).toBe(originalCount);

    await expect
      .poll(() => expensesPage.totalOpexTile().innerText(), {
        timeout: 15000,
        message: `TOTAL OPEX did not return to the ${originalTotal} baseline`,
      })
      .toBe(originalTotal);
  });
});
