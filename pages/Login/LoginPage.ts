import { Page } from '@playwright/test';
import { LoginLocators } from './LoginLocators';

export class LoginPage {
  readonly page: Page;
  readonly locators = LoginLocators;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/login');
    await this.locators.emailInput(this.page).waitFor({ state: 'visible' });
    // The form renders before Clerk has hydrated it, and a Sign in click placed in that gap is
    // silently dropped - no request is sent at all. Clerk publishes its own readiness flag, so
    // wait on that rather than on a network-quiet heuristic.
    await this.page.waitForFunction(() => (window as unknown as { Clerk?: { loaded?: boolean } }).Clerk?.loaded === true);
  }

  async login(email: string, password: string) {
    await this.locators.emailInput(this.page).fill(email);
    await this.locators.passwordInput(this.page).fill(password);
    await this.locators.signInButton(this.page).click();
  }

  async clickContinueWithGoogle() {
    await this.locators.continueWithGoogleButton(this.page).click();
  }

  errorMessage() {
    return this.locators.errorAlert(this.page);
  }

  verificationCodeField() {
    return this.locators.verificationCodeInput(this.page);
  }

  async isEmailFieldValid(): Promise<boolean> {
    return this.locators.emailInput(this.page).evaluate((el: HTMLInputElement) => el.checkValidity());
  }
}
