import { Page } from '@playwright/test';

export const LoginLocators = {
  emailInput: (page: Page) => page.getByRole('textbox', { name: 'Email address' }),
  passwordInput: (page: Page) => page.getByRole('textbox', { name: 'Password' }),
  signInButton: (page: Page) => page.getByRole('button', { name: 'Sign in' }),
  continueWithGoogleButton: (page: Page) => page.getByRole('button', { name: 'Continue with Google' }),
  errorAlert: (page: Page) => page.getByRole('alert'),
  verificationCodeInput: (page: Page) => page.getByRole('textbox', { name: 'Verification code' }),
};
