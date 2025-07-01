import { test, expect, Page, Locator } from '@playwright/test';

interface FormData {
  email: string;
}

class PolicyFormPage {
  readonly page: Page;
  readonly emailField: Locator;
  readonly emailError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailField = this.page.locator('#email');
    this.emailError = this.page.locator('#email-error');
  }

  async fillEmail(email: string): Promise<void> {
    await this.emailField.fill(email);
  }

  async submitForm(): Promise<void> {
    await this.page.click('button[type="submit"]');
  }

  async getEmailError(): Promise<string | null> {
    try {
      await this.emailError.waitFor({ state: 'visible' });
      return this.emailError.textContent();
    } catch {
      return null;
    }
  }

  async isFormValid(): Promise<boolean> {
    const errorText = await this.getEmailError();
    return !errorText;
  }
}

test.describe('EMAIL Field Core Validation', () => {
  let page: Page;
  let policyFormPage: PolicyFormPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://localhost:5500/policy-form.html');
    policyFormPage = new PolicyFormPage(page);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should validate email field as required', async () => {
    await policyFormPage.fillEmail('');
    await policyFormPage.submitForm();

    const errorText = await policyFormPage.getEmailError();
    expect(errorText).toBe('This field is required');
  });

  test('should validate email field with proper format', async () => {
    await policyFormPage.fillEmail('invalid-email');
    await policyFormPage.submitForm();

    const errorText = await policyFormPage.getEmailError();
    expect(errorText).toBe('Please enter a valid email address');
  });

  test('should allow valid email field submission', async () => {
    await policyFormPage.fillEmail('test@example.com');
    await policyFormPage.submitForm();

    expect(await policyFormPage.isFormValid()).toBe(true);
  });

});
