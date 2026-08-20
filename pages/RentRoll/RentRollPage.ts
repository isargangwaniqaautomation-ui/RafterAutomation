import { Locator, Page } from '@playwright/test';
import { RentRollLocators } from './RentRollLocators';
import { MarketLeasingLocators } from '../MarketLeasing/MarketLeasingLocators';

/**
 * Converts a displayed money string into a number.
 * Handles the formats the Rent Roll UI actually renders: `$29K`, `$4.9K`, `$1.2M`,
 * `$25,400`, `($559)` for negatives and `—` for "no value".
 */
export function parseCurrency(display: string): number {
  const text = display.trim();
  if (text === '' || text === '—' || text === '-') {
    return 0;
  }

  const isNegative = /^\(.*\)$/.test(text);
  const match = text.replace(/[()$,\s]/g, '').match(/^(-?\d+(?:\.\d+)?)([KMB]?)$/i);
  if (!match) {
    throw new Error(`Unrecognised currency format: "${display}"`);
  }

  const scale: Record<string, number> = { '': 1, K: 1e3, M: 1e6, B: 1e9 };
  const value = Number(match[1]) * scale[match[2].toUpperCase()];
  return isNegative ? -value : value;
}

/**
 * Half of the smallest step the UI can express for a displayed money string, i.e. the
 * maximum rounding error that value already carries. `$29K` -> 500, `$4.9K` -> 50, `$559` -> 0.5.
 * Used to size an assertion tolerance from the app's real display precision instead of guessing one.
 */
export function currencyDisplayTolerance(display: string): number {
  const text = display.trim();
  if (text === '' || text === '—' || text === '-') {
    return 0;
  }

  const match = text.replace(/[()$,\s]/g, '').match(/^-?\d+(?:\.(\d+))?([KMB]?)$/i);
  if (!match) {
    throw new Error(`Unrecognised currency format: "${display}"`);
  }

  const scale: Record<string, number> = { '': 1, K: 1e3, M: 1e6, B: 1e9 };
  const step = scale[match[2].toUpperCase()] / 10 ** (match[1]?.length ?? 0);
  return step / 2;
}

/** One tenant row of the Rent Roll grid. */
export interface TenantRow {
  suite: string;
  name: string;
  reimbursementProfile: string;
  hasOptionBadge: boolean;
}

export class RentRollPage {
  readonly page: Page;
  readonly locators = RentRollLocators;

  constructor(page: Page) {
    this.page = page;
  }

  async gotoFromTabBar() {
    await this.locators.rentRollTab(this.page).click();
    await this.locators.grid(this.page).waitFor({ state: 'visible' });
  }

  async goToMarketLeasing() {
    await this.locators.marketLeasingTab(this.page).click();
    await MarketLeasingLocators.heading(this.page).waitFor({ state: 'visible' });
  }

  occupancyTile() {
    return this.locators.statTile(this.page, 'Occupancy');
  }

  waltTile() {
    return this.locators.statTile(this.page, 'WALT');
  }

  inPlaceRentTile() {
    return this.locators.statTile(this.page, 'In-place rent');
  }

  tenantsTile() {
    return this.locators.statTile(this.page, 'Tenants');
  }

  totalSfTile() {
    return this.locators.statTile(this.page, 'Total SF');
  }

  kpiStrip() {
    return {
      leveredIrr: this.locators.kpiLeveredIrr(this.page),
      equityMultiple: this.locators.kpiEquityMultiple(this.page),
      price: this.locators.kpiPrice(this.page),
      goingInCap: this.locators.kpiGoingInCap(this.page),
      minDscr: this.locators.kpiMinDscr(this.page),
      cashOnCash: this.locators.kpiCashOnCash(this.page),
    };
  }

  async scrollContent(offset: number) {
    await this.locators.contentPane(this.page).evaluate((el, y) => {
      el.scrollTop = y;
    }, offset);
  }

  async dataRowCount(): Promise<number> {
    const rowsWithCells = this.locators.gridDataAndTotalRows(this.page);
    const all = await rowsWithCells.count();
    const totalRow = await rowsWithCells.filter({ hasText: 'Total' }).count();
    return all - totalRow;
  }

  /**
   * Position of a grid column, read from the rendered header row.
   * The header row is upper-cased by CSS, so names are matched case-insensitively.
   */
  async gridColumnIndex(columnName: string): Promise<number> {
    const headers = this.locators.gridColumnHeaders(this.page);
    await headers.first().waitFor({ state: 'visible' });
    const names = (await headers.allInnerTexts()).map((name) => name.trim());
    const index = names.findIndex((name) => name.toLowerCase() === columnName.toLowerCase());
    if (index === -1) {
      throw new Error(`Rent roll column "${columnName}" not found. Columns: ${names.join(' | ')}`);
    }
    return index;
  }

  /** `Reimb. profile` value of every tenant row, in grid order. */
  async tenantReimbursementProfiles(): Promise<string[]> {
    const columnIndex = await this.gridColumnIndex('Reimb. profile');
    const rows = this.locators.tenantRows(this.page);
    await rows.first().waitFor({ state: 'visible' });

    const values: string[] = [];
    for (let index = 0; index < (await rows.count()); index++) {
      const cell = this.locators.gridCell(rows.nth(index), columnIndex);
      values.push((await this.locators.gridCellSelectValue(cell).innerText()).trim());
    }
    return values;
  }

  /** How many tenant rows are assigned to the given reimbursement profile. */
  async countTenantsWithReimbursementProfile(profile: string): Promise<number> {
    const profiles = await this.tenantReimbursementProfiles();
    return profiles.filter((value) => value === profile).length;
  }

  async openTenantRollover(tenantName: string) {
    await this.locators.tenantButton(this.page, tenantName).click();
  }

  tenantSuite(tenantName: string) {
    return this.locators.tenantRow(this.page, tenantName).getByRole('gridcell').nth(1);
  }

  rolloverPanel() {
    return this.locators.rolloverPanel(this.page);
  }

  contractualFields() {
    return {
      exerciseProbability: this.locators.exerciseProbabilityInput(this.page),
      renewalRate: this.locators.renewalRateInput(this.page),
      term: this.locators.contractualTermInput(this.page),
      ti: this.locators.contractualTiInput(this.page),
      downtime: this.locators.contractualDowntimeInput(this.page),
    };
  }

  marketFields() {
    return {
      renewalProbability: this.locators.renewalProbabilityInput(this.page),
      marketRentPsf: this.locators.marketRentPsfInput(this.page),
      term: this.locators.marketTermInput(this.page),
      tiNew: this.locators.tiNewInput(this.page),
      downtime: this.locators.marketDowntimeInput(this.page),
    };
  }

  async setExerciseProbability(value: string) {
    const input = this.locators.exerciseProbabilityInput(this.page);
    await input.fill(value);
    await input.press('Tab');
  }

  async openTenantCashFlow() {
    await this.locators.tenantCashFlowLink(this.page).click();
    await this.locators.cashFlowPanel(this.page).waitFor({ state: 'visible' });
    await this.locators.cashFlowTable(this.page).waitFor({ state: 'visible' });
  }

  cashFlowPanel() {
    return this.locators.cashFlowPanel(this.page);
  }

  cashFlowPanelTitle() {
    return this.locators.cashFlowPanelTitle(this.page);
  }

  cashFlowPanelHeader() {
    return this.locators.cashFlowPanelHeader(this.page);
  }

  cashFlowTable() {
    return this.locators.cashFlowTable(this.page);
  }

  cashFlowTotalRow(label: string) {
    return this.locators.cashFlowTotalRow(this.page, label);
  }

  async cashFlowColumns(): Promise<string[]> {
    const columnHeaders = this.locators.cashFlowColumnHeaders(this.page);
    await columnHeaders.first().waitFor({ state: 'visible' });
    const headers = await columnHeaders.allInnerTexts();
    return headers.map((header) => header.trim());
  }

  /** Calendar years of the annual rows, in the order the panel renders them. */
  async cashFlowYears(): Promise<number[]> {
    const rows = this.locators.cashFlowAnnualRows(this.page);
    await rows.first().waitFor({ state: 'visible' });
    const texts = await rows.allInnerTexts();
    return texts.map((text) => Number(text.trim().slice(0, 4)));
  }

  /** Displayed value of one column for the given annual row, e.g. `$29K`. */
  async cashFlowAnnualValue(year: number, columnName: string): Promise<string> {
    return this.cashFlowCellText(this.locators.cashFlowYearRow(this.page, year), columnName);
  }

  /** Displayed values of one column for every requested annual row, in year order. */
  async cashFlowAnnualValues(years: number[], columnName: string): Promise<string[]> {
    const values: string[] = [];
    for (const year of years) {
      values.push(await this.cashFlowAnnualValue(year, columnName));
    }
    return values;
  }

  /** Displayed value of one column on the panel's total row, e.g. the `11-yr Total` row. */
  async cashFlowTotalValue(totalRowLabel: string, columnName: string): Promise<string> {
    return this.cashFlowCellText(this.locators.cashFlowTotalRow(this.page, totalRowLabel), columnName);
  }

  private async cashFlowCellText(row: Locator, columnName: string): Promise<string> {
    const columns = await this.cashFlowColumns();
    const columnIndex = columns.indexOf(columnName);
    if (columnIndex === -1) {
      throw new Error(`Cash flow column "${columnName}" not found. Columns: ${columns.join(' | ')}`);
    }

    // The total row merges its first cells with colspan, so cell position != column position.
    return row.evaluate((element, index) => {
      let column = 0;
      for (const cell of Array.from(element.children) as HTMLTableCellElement[]) {
        const span = cell.colSpan || 1;
        if (index < column + span) {
          return cell.textContent?.trim() ?? '';
        }
        column += span;
      }
      return '';
    }, columnIndex);
  }

  /**
   * Every tenant row as the grid renders it: suite, tenant name, assigned reimbursement
   * profile and whether the row carries an `OPT` badge. Read once and reused by the
   * reimbursement and renewal-option checks so the grid is only walked a single time.
   */
  async tenantRoster(): Promise<TenantRow[]> {
    const suiteIndex = await this.gridColumnIndex('Suite');
    const profileIndex = await this.gridColumnIndex('Reimb. profile');
    const rows = this.locators.tenantRows(this.page);
    await rows.first().waitFor({ state: 'visible' });

    const roster: TenantRow[] = [];
    for (let index = 0; index < (await rows.count()); index++) {
      const row = rows.nth(index);
      const profileCell = this.locators.gridCell(row, profileIndex);
      roster.push({
        suite: (await this.locators.gridCell(row, suiteIndex).innerText()).trim(),
        name: (await this.locators.tenantNameText(row).innerText()).trim(),
        reimbursementProfile: (await this.locators.gridCellSelectValue(profileCell).innerText()).trim(),
        hasOptionBadge: (await this.locators.optBadge(row).count()) > 0,
      });
    }
    return roster;
  }

  optBadge(tenantName: string) {
    return this.locators.optBadge(this.locators.tenantRow(this.page, tenantName));
  }

  contractualSection() {
    return this.locators.contractualSection(this.page);
  }

  /** Lease citation the contractual block carries, or `null` when no option is configured. */
  async contractualCitation(): Promise<string | null> {
    const cite = this.locators.contractualCite(this.page);
    return (await cite.count()) === 0 ? null : (await cite.innerText()).trim();
  }

  /** Current value of every contractual-option field, keyed the way the panel labels them. */
  async contractualValues(): Promise<Record<string, string>> {
    const fields = this.contractualFields();
    const values: Record<string, string> = {};
    for (const [name, field] of Object.entries(fields)) {
      values[name] = (await field.inputValue()).trim();
    }
    return values;
  }

  async closeTenantRollover() {
    await this.locators.rolloverCloseButton(this.page).click();
    await this.rolloverPanel().waitFor({ state: 'detached' });
  }
}
