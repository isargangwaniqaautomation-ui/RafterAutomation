# Rafter — Playwright Test Automation

End-to-end UI automation for [Rafter CRE](https://app.raftercre.com), a commercial-real-estate
underwriting platform. Built with [Playwright Test](https://playwright.dev) and TypeScript using a
strict Page Object Model.

The suite covers the critical user journeys of a deal model — the Deals list, Dashboard, Rent Roll,
Market Leasing, Reimbursement Profiles, Expenses, General Assumptions, Valuation & Debt, Cash Flow,
Model Health and Documents — asserting both what the UI renders and that the numbers reconcile
across sheets after an edit.

---

## Tech stack

| Concern | Choice |
| --- | --- |
| Test runner | `@playwright/test` ^1.62 |
| Language | TypeScript ^5.9 (`strict: true`) |
| Pattern | Page Object Model (locators split from actions) |
| Browsers | Chromium, Firefox, WebKit |
| Reporting | Playwright HTML report; optional Allure |

---

## Project structure

```
pages/<Feature>/<Feature>Locators.ts   # selectors only — no logic
pages/<Feature>/<Feature>Page.ts       # user-action functions built on the locators
tests/<Feature>/<feature>.spec.ts      # descriptions, steps, assertions
utils/                                 # shared helpers and stored auth state (git-ignored)
playwright.config.ts                   # runner, browser and timeout configuration
```

Rules the repo follows:

- One folder per feature under `pages/`, mirrored under `tests/`.
- `*Locators.ts` files export locators only — never actions or assertions.
- `*Page.ts` files expose meaningful user actions (`openDeal(name)`, `login(email, password)`),
  not thin locator passthroughs.
- Specs consume page objects rather than raw selectors.
- Selector priority: `data-testid` > accessible role/name > label > name > id > other stable
  attribute. Generated CSS classes and brittle XPath are not used.

---

## Getting started

### Prerequisites

- Node.js 20.6+ (the config uses `process.loadEnvFile`)
- npm

### Install

```bash
npm install
npx playwright install
```

### Configure environment

Create a `.env` file in the repo root (it is git-ignored):

```env
LOGIN_VALID_PASSWORD=
GOOGLE_TEST_EMAIL=
GOOGLE_TEST_PASSWORD=
```

`playwright.config.ts` loads this file automatically when present. No credentials are committed —
tests that need a secret skip themselves when the variable is missing.

### Authenticated session

Every feature suite runs against an authenticated Google session stored at
`utils/googleAuthState.json` (git-ignored). Generate it once by signing in and saving storage state,
for example:

```bash
npx playwright codegen --save-storage=utils/googleAuthState.json https://app.raftercre.com/login
```

If the file is absent, the authenticated suites skip with a clear message instead of failing.

---

## Running the tests

```bash
npm test                  # full suite, all three browser projects
npm run test:chromium     # Chromium only (fastest feedback loop)

npx playwright test tests/RentRoll            # one feature
npx playwright test -g "TC-CUJ-08"            # one test case by ID
npx playwright test --headed --project=chromium
npx playwright test --debug                   # Playwright Inspector
```

View the HTML report:

```bash
npx playwright show-report
```

### Allure reporting (optional)

`allure-commandline` and `allure-playwright` are installed for teams that prefer Allure. The usual
run-then-review loop is two commands:

```bash
npm run test:allure       # run the Chromium suite, then regenerate allure-report/
npm run allure:open       # open the generated report in a browser
```

The individual steps are available too:

```bash
npm run allure:generate   # build allure-report/ from allure-results/
npm run allure:serve      # generate and serve in one step (keeps no allure-report/)
```

Two caveats worth knowing:

- Allure is not registered as a reporter in `playwright.config.ts` by default — add
  `['allure-playwright']` to the `reporter` array so runs emit `allure-results/`.
- `test:allure` chains its two steps with `&`. On Windows, where npm's default script shell is
  `cmd.exe`, that runs them sequentially as intended; under a POSIX shell `&` backgrounds the test
  run and the report is built from stale results. On macOS/Linux use
  `npm run test:chromium && npm run allure:generate` instead.

---

## Execution model

The suite runs **serially** (`fullyParallel: false`, `workers: 1`) and this is deliberate: all specs
drive the same live sample deal, and several of them mutate it. Run in parallel, one test's edit
lands inside another's baseline assertion and its restore undoes an edit a third test is still
asserting on.

Other notable settings in `playwright.config.ts`:

| Setting | Value | Reason |
| --- | --- | --- |
| `timeout` | 90 s | Hooks navigate, open a deal and switch sheets against a remote model that recalculates on every edit |
| `expect.timeout` | 15 s | Recalculated values settle asynchronously |
| `actionTimeout` / `navigationTimeout` | 20 s / 45 s | Heavy grid rendering on first paint |
| `retries` | 2 on CI, 0 locally | Absorbs remote-model flakiness on CI only |
| `trace` | `on-first-retry` | Full trace for anything that fails twice |
| `screenshot` / `video` | on failure only | Keeps artifacts small |

Tests that mutate the deal restore the original value before finishing, so the suite is re-runnable.

---

## Coverage

| Feature | Spec | Focus |
| --- | --- | --- |
| Login | `tests/Login/login.spec.ts` | Field validation, invalid password, MFA prompt, Google OAuth redirect |
| Deals | `tests/Deals/deals.spec.ts` | List columns, navigation to a deal, list-vs-dashboard reconciliation |
| Dashboard | `tests/Dashboard/dashboard.spec.ts` | Return tiles, Sources & Uses balance, trial banner |
| Rent Roll | `tests/RentRoll/rentRoll.spec.ts` | KPI strip persistence, occupancy, rollover panel, IRR recalculation, tenant cash flow, OPT badges |
| Market Leasing | `tests/MarketLeasing/marketLeasing.spec.ts` | Leasing profile columns, new profile persists across reload |
| Reimbursement Profiles | `tests/ReimbursementProfiles/reimbursementProfiles.spec.ts` | NNN tenant counts vs Rent Roll, profile type persistence |
| Expenses | `tests/Expenses/expenses.spec.ts` | OpEx totals, reimbursement toggle recalculation, add/delete line item |
| General Assumptions | `tests/General/general.spec.ts` | Baseline deal-wide values, Snapshots & Scenarios drawer |
| Valuation & Debt | `tests/ValuationDebt/valuationDebt.spec.ts` | Purchase price consistency, Solve to Target, loan sizing chips |
| Cash Flow | `tests/CashFlow/cashFlow.spec.ts` | NOI vs Dashboard, source panel totals, display formats, DSCR chart, CSV export |
| Model Health | `tests/ModelHealth/modelHealth.spec.ts` | Vacancy warning lifecycle, inline fix, AI deep scan states |
| Documents | `tests/Documents/documents.spec.ts` | Empty state and upload file chooser |

Tests are named with their source test-case ID (`TC-CUJ-08`, `TC_DEALS_001`) so a run maps directly
back to the test plan.

---

## Conventions

- **Test data** comes from the supplied test case only. Nothing is invented, and credentials live in
  `.env`, never in source.
- **Deviations are documented in the spec.** Where the app's real behaviour differs from a written
  test case, the test asserts what the app actually renders and a comment records why.
- **Failures get diagnosed, not silenced.** Classify a failure as a bad locator, bad page-object
  function, bad test logic, timing, or a genuine app defect. Automation issues are fixed and re-run;
  app defects are reported as-is rather than worked around.
- **Minimal diffs.** Reuse existing locators and page-object functions; update in place instead of
  adding near-duplicates. No new dependencies without a real need.

---

## Git-ignored artifacts

`node_modules/`, `test-results/`, `playwright-report/`, `allure-results/`, `allure-report/`,
`dist/`, `.env`, and `utils/*AuthState.json` are excluded from version control.
