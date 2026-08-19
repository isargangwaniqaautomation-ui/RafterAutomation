---
name: playwright-automate
description: Convert supplied test cases (ID, description, preconditions, steps, data, expected result) into Playwright + TypeScript automation in this repo's POM structure. Use when the user says things like "create/automate these test cases", "add Playwright tests", "automate this scenario", "implement these test cases".
---

# Playwright test-case automation

Full architecture/conventions are in project `CLAUDE.md` — don't re-read it every run, only re-check if unsure of a rule.

## Per batch of test cases

1. Group test cases by feature (e.g. `TC_LOGIN_*` → Login).
2. For each affected feature, once: read its `pages/<Feature>/*Locators.ts`, `*Page.ts`, and `tests/<Feature>/*.spec.ts`. Don't scan unrelated features/files.
3. If the feature folder doesn't exist, create `pages/<Feature>/{<Feature>Locators.ts,<Feature>Page.ts}` and `tests/<Feature>/<feature>.spec.ts`.
4. Use the Playwright browser tools to open/navigate the real app and confirm selectors before writing them. Never guess a selector or URL.
5. Reuse existing locators/functions. Add only what's missing, in the right file (locators vs. actions).
6. Write/extend the spec using Page Object functions; assertions must map directly to the test case's Expected Result — nothing extra.
7. Run only the affected spec file (not the whole suite).
8. On failure: fix automation issues (locator/timing/logic) and re-run. If the app itself is behaving wrong, stop and report the defect — don't force the test green.
9. Report back tersely: what was added/changed, pass/fail result, and any genuine blocker/question. No step-by-step narration, no restating these instructions.

Don't create sample/demo test cases on your own initiative — only automate what's supplied.
