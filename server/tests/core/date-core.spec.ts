import { test, expect, Page, Locator } from '@playwright/test';

interface FormData {
  dob: string;
}

class PolicyFormPage {
  readonly page: Page;
  readonly dobField: Locator;
  readonly dobError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dobField = this.page.locator('#dob');
    this.dobError = this.page.locator('#dob-error');
  }

  async fillDate(dob: string): Promise<void> {
    await this.dobField.fill(dob);
  }

  async submitForm(): Promise<void> {
    await this.page.click('button[type="submit"]');
  }

  async getDateError(): Promise<string | null> {
    try {
      await this.dobError.waitFor({ state: 'visible' });
      return this.dobError.textContent();
    } catch {
      return null;
    }
  }

  async isFormValid(): Promise<boolean> {
    const errorText = await this.getDateError();
    return !errorText;
  }
}

test.describe('DATE Field Core Validation', () => {
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

  test('should validate dob field as required', async () => {
    await policyFormPage.fillDate('');
    await policyFormPage.submitForm();

    const errorText = await policyFormPage.getDateError();
    expect(errorText).toBe('This field is required');
  });

  test('should validate dob field with proper format', async () => {
    await policyFormPage.fillDate('invalid-date');
    await policyFormPage.submitForm();

    const errorText = await policyFormPage.getDateError();
    expect(errorText).toBe('Please enter a valid date');
  });

  test('should allow valid dob field submission', async () => {
    await policyFormPage.fillDate('2000-01-01');
    await policyFormPage.submitForm();

    expect(await policyFormPage.isFormValid()).toBe(true);
  });

});
