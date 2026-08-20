import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/Login/LoginPage';

const VALID_EMAIL = 'isar.gangwani.qa+1994@gmail.com';
const VALID_PASSWORD = process.env.LOGIN_VALID_PASSWORD ?? '';
const GOOGLE_AUTH_STATE = 'utils/googleAuthState.json';

test.describe('Login', () => {
  test.skip('TC_LOGIN_001 - invalid email is rejected before sign-in', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('invalid-email-format', VALID_PASSWORD || 'placeholder-password');

    await expect(page).toHaveURL(/\/login/);
    await expect(await loginPage.isEmailFieldValid()).toBe(false);
  });

  test.skip('TC_LOGIN_002 - invalid password is rejected with an error message', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(VALID_EMAIL, 'WrongPassword_Invalid123!');

    await expect(loginPage.errorMessage()).toHaveText(
      'Password is incorrect. Try again, or use another method.',
      { timeout: 10000 },
    );
    await expect(page).toHaveURL(/\/login/);
  });

  test.skip('TC_LOGIN_003 - valid credentials pass authentication', async ({ page }) => {
    test.skip(!VALID_PASSWORD, 'LOGIN_VALID_PASSWORD is not set');
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(VALID_EMAIL, VALID_PASSWORD);

    await expect(loginPage.verificationCodeField()).toBeVisible({ timeout: 10000 });
  });

  test.skip('TC_LOGIN_004a - Continue with Google redirects to Google OAuth', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.clickContinueWithGoogle();

    await expect(page).toHaveURL(/accounts\.google\.com/, { timeout: 10000 });
  });
});

test.describe('Login - Google authenticated session', () => {
  test.skip(!fs.existsSync(GOOGLE_AUTH_STATE), 'No stored Google auth session (utils/googleAuthState.json)');
  test.use({ storageState: GOOGLE_AUTH_STATE });

  test.skip('TC_LOGIN_004b - Google-authenticated user has access to the Deal page', async ({ page }) => {
    await page.goto('/deals');
    await expect(page).toHaveURL(/\/deals/);
  });
});
