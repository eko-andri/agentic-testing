import { test, expect, Page, Locator } from '@playwright/test';

interface FormData {
  mobile: string;
}

class PolicyFormPage {
  readonly page: Page;
  readonly mobileField: Locator;
  readonly mobileError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.mobileField = this.page.locator('#mobile');
    this.mobileError = this.page.locator('#mobile-error');
  }

  async fillPhone(mobile: string): Promise<void> {
    await this.mobileField.fill(mobile);
  }

  async submitForm(): Promise<void> {
    await this.page.click('button[type="submit"]');
  }

  async getPhoneError(): Promise<string | null> {
    try {
      await this.mobileError.waitFor({ state: 'visible' });
      return this.mobileError.textContent();
    } catch {
      return null;
    }
  }

  async isFormValid(): Promise<boolean> {
    const errorText = await this.getPhoneError();
    return !errorText;
  }
}

test.describe('PHONE Field Core Validation', () => {
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

  test('should validate mobile field as required', async () => {
    await policyFormPage.fillPhone('');
    await policyFormPage.submitForm();

    const errorText = await policyFormPage.getPhoneError();
    expect(errorText).toBe('This field is required');
  });

  test('should validate mobile field with proper format', async () => {
    await policyFormPage.fillPhone('123456789');
    await policyFormPage.submitForm();

    const errorText = await policyFormPage.getPhoneError();
    expect(errorText).toBe('Invalid phone number');
  });

  test('should allow valid mobile field submission', async () => {
    await policyFormPage.fillPhone('1234567890');
    await policyFormPage.submitForm();

    expect(await policyFormPage.isFormValid()).toBe(true);
  });

});
