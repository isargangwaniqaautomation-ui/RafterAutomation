# Rafter — Playwright + TypeScript Automation

Playwright Test + TypeScript + Page Object Model. Keep it simple: no extra frameworks, fixtures, factories, or abstraction layers beyond what's here.

## Architecture

```
pages/<Feature>/<Feature>Locators.ts   # selectors ONLY, no logic
pages/<Feature>/<Feature>Page.ts       # reusable user-action functions, import locators
tests/<Feature>/<feature>.spec.ts      # test description, steps, assertions
utils/                                 # shared helpers (currently empty)
```

- One folder per feature under `pages/`, mirrored under `tests/`.
- `*Locators.ts`: locators only. No test logic, no actions.
- `*Page.ts`: functions represent meaningful user actions (e.g. `login(user, pass)`), not raw locator passthroughs.
- Tests use Page Object functions, not raw locators, unless there's a strong reason.
- Before adding anything: check existing locator file, page object, and spec for reusable pieces. Never duplicate.

## Selector priority

`data-testid` > accessible role/name > label > name > id > other stable attribute. Never generated CSS classes or fragile XPath when a better option exists. Always inspect the real running app via the browser tool before writing a selector — never invent one. If the UI changed, update the existing locator instead of adding a duplicate.

## Test data

Use only what's supplied in the test case. Never invent credentials/data. Never hard-code sensitive credentials — if the test case gives none, ask.

## Failure handling

On failure, diagnose: bad locator / bad page-object function / bad test logic / timing / real app defect. Fix automation issues yourself and re-run. If the app itself looks defective, report the defect plainly — don't rewrite the test to force a pass.

## Working style

Strongly typed, readable, minimal diffs. No new dependencies unless truly required. Don't over-explain finished work — report only what changed and the run result, or ask when something is genuinely ambiguous (missing data, no locator candidate exists, etc).

For the full test-case-to-automation workflow, see the `playwright-automate` skill.
