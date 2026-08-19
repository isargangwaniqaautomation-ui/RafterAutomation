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
    await this.page.waitForLoadState('networkidle');
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
