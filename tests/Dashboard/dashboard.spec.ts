import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { DealsPage } from '../../pages/Deals/DealsPage';
import { DashboardPage } from '../../pages/Dashboard/DashboardPage';
import { parseCurrency } from '../../pages/RentRoll/RentRollPage';

const DEAL_NAME = 'Elm Street Plaza';
const AUTH_STATE = 'utils/googleAuthState.json';
const PERCENT_OR_MULTIPLE = /^-?\d+(\.\d+)?(%|x)$/;

const EXPECTED_SOURCES = {
  seniorDebt: '$1,625,000',
  equity: '$1,114,526',
  totalSources: '$2,739,526',
};
const EXPECTED_USES = {
  purchasePrice: '$2,500,000',
  closingCosts: '$148,092',
  financingCosts: '$75,885',
  operatingReserve: '$15,549',
  totalUses: '$2,739,526',
};

const TRIAL_DAYS_PATTERN = /Trial · (\d+) days? left/;
const TRIAL_ALLOWANCE_PATTERN = /\d+ of 20 AI messages \(shared with voice\) · exports watermarked/;

test.describe('Dashboard', () => {
  test.skip(!fs.existsSync(AUTH_STATE), 'No stored authenticated session (utils/googleAuthState.json)');
  test.use({ storageState: AUTH_STATE });

  test('TC-CUJ-03 - Dashboard return tiles render correctly formatted, non-empty values', async ({ page }) => {
    const dealsPage = new DealsPage(page);
    await dealsPage.goto();
    await dealsPage.openDeal(DEAL_NAME);

    const dashboardPage = new DashboardPage(page);
    const tiles = dashboardPage.returnTiles();

    const expected: Record<string, string> = {
      leveredIrr: '5.38%',
      equityMultiple: '1.60x',
      unleveredIrr: '6.17%',
      cashOnCash: '3.06%',
    };

    for (const [key, locator] of Object.entries(tiles)) {
      const text = (await locator.textContent())?.trim() ?? '';
      expect(text, `${key} should not be blank`).not.toBe('');
      expect(text, `${key} should not be a dash`).not.toBe('—');
      expect(text, `${key} should match a percentage or multiple format`).toMatch(PERCENT_OR_MULTIPLE);
      expect(text, `${key} should match the current sample-deal baseline`).toBe(expected[key]);
    }
  });

  test('TC-CUJ-29 - Sources & Uses balance, and each side adds up on its own', async ({ page }) => {
    const dealsPage = new DealsPage(page);
    await dealsPage.goto();
    await dealsPage.openDeal(DEAL_NAME);

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.gotoFromTabBar();

    const panel = dashboardPage.sourcesUsesPanel();
    await panel.scrollIntoViewIfNeeded();
    await expect(panel).toBeVisible();

    // Sources. The senior debt row carries its LTV alongside the label, e.g. `Senior debt · 65.0% LTV`.
    expect(await dashboardPage.susRowLabel('senior-debt')).toContain('Senior debt');
    expect(await dashboardPage.susRowLabel('equity')).toBe('Equity');
    const seniorDebt = await dashboardPage.susRowAmount('senior-debt');
    const equity = await dashboardPage.susRowAmount('equity');
    const totalSources = await dashboardPage.totalSources();

    // Uses.
    expect(await dashboardPage.susRowLabel('purchase-price')).toBe('Purchase price');
    expect(await dashboardPage.susRowLabel('closing-costs')).toBe('Closing costs');
    expect(await dashboardPage.susRowLabel('financing-costs')).toBe('Financing costs');
    expect(await dashboardPage.susRowLabel('operating-reserve')).toBe('Operating reserve');
    const purchasePrice = await dashboardPage.susRowAmount('purchase-price');
    const closingCosts = await dashboardPage.susRowAmount('closing-costs');
    const financingCosts = await dashboardPage.susRowAmount('financing-costs');
    const operatingReserve = await dashboardPage.susRowAmount('operating-reserve');
    const totalUses = await dashboardPage.totalUses();

    // Both sides are recomputed from the figures the panel itself renders, not asserted
    // against a single hard-coded total.
    const sourcesSum = parseCurrency(seniorDebt) + parseCurrency(equity);
    expect(
      sourcesSum,
      `Senior debt ${seniorDebt} + Equity ${equity} should equal Total sources ${totalSources}`,
    ).toBe(parseCurrency(totalSources));

    const usesSum =
      parseCurrency(purchasePrice) +
      parseCurrency(closingCosts) +
      parseCurrency(financingCosts) +
      parseCurrency(operatingReserve);
    expect(
      usesSum,
      `${purchasePrice} + ${closingCosts} + ${financingCosts} + ${operatingReserve} should equal Total uses ${totalUses}`,
    ).toBe(parseCurrency(totalUses));

    expect(parseCurrency(totalSources), 'Total sources should equal Total uses').toBe(parseCurrency(totalUses));

    // The sample deal's documented baseline.
    expect({ seniorDebt, equity, totalSources }).toEqual(EXPECTED_SOURCES);
    expect({ purchasePrice, closingCosts, financingCosts, operatingReserve, totalUses }).toEqual(EXPECTED_USES);
  });

  // TC-CUJ-35 documents `Trial · 11 days left` and `1 of 20 AI messages`. Both count down with
  // real time and real usage on the shared trial account, so the banner's wording and structure
  // are asserted rather than the two figures that are guaranteed to move.
  test('TC-CUJ-35 - Trial banner states the trial status and collapses and expands', async ({ page }) => {
    const dealsPage = new DealsPage(page);
    await dealsPage.goto();
    await dealsPage.openDeal(DEAL_NAME);

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.gotoFromTabBar();

    const banner = dashboardPage.trialNotice();
    await expect(banner).toBeVisible();
    expect(await dashboardPage.isTrialNoticeCollapsed()).toBe(false);

    const bannerText = (await banner.innerText()).trim();
    expect(bannerText, 'Banner should state the remaining trial days').toMatch(TRIAL_DAYS_PATTERN);
    expect(bannerText, 'Banner should state the AI message allowance').toMatch(TRIAL_ALLOWANCE_PATTERN);

    // The leading badge repeats the day count the sentence gives.
    const daysLeft = bannerText.match(TRIAL_DAYS_PATTERN)?.[1];
    expect(bannerText.split('\n')[0].trim()).toBe(daysLeft);

    // Present and clickable, but deliberately never clicked - it starts a paid subscription.
    await expect(dashboardPage.upgradeButton()).toBeVisible();
    await expect(dashboardPage.upgradeButton()).toBeEnabled();

    try {
      await dashboardPage.collapseTrialNotice();
      expect(await dashboardPage.isTrialNoticeCollapsed()).toBe(true);
      await expect(dashboardPage.upgradeButton()).toHaveCount(0);
      await expect(banner).toContainText(TRIAL_DAYS_PATTERN);

      // Collapsing must not take the Dashboard with it.
      await expect(dashboardPage.yr1NoiTile()).toBeVisible();
      await expect(dashboardPage.sourcesUsesPanel()).toBeVisible();
      await expect(dashboardPage.returnTiles().leveredIrr).toBeVisible();
    } finally {
      // The collapsed state is remembered between sessions, so it is always put back.
      if (await dashboardPage.isTrialNoticeCollapsed()) {
        await dashboardPage.expandTrialNotice();
      }
    }

    await expect(banner).toBeVisible();
    expect(await dashboardPage.isTrialNoticeCollapsed()).toBe(false);
    await expect(dashboardPage.upgradeButton()).toBeVisible();
    expect((await banner.innerText()).trim()).toBe(bannerText);
  });
});
