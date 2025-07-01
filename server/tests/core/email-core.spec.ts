import { test, expect, Page, Locator } from '@playwright/test';

interface FormData {
  email: string;
}

interface ValidationError {
  fieldName: string;
  errorMessage: string;
}

interface TestScenario {
  description: string;
  data: FormData;
  expectedErrors?: ValidationError[];
  shouldSubmit: boolean;
}

class PolicyFormPage {
  readonly page: Page;
  readonly emailField: Locator;
  readonly emailError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailField = page.locator('#email');
    this.emailError = page.locator('#email-error');
  }

  async fillEmail(email: string): Promise<void> {
    await this.emailField.fill(email);
  }

  async clearEmail(): Promise<void> {
    await this.emailField.clear();
  }

  async submitForm(): Promise<void> {
    await this.page.click('button[type="submit"]');
  }

  async validateEmailError(expectedError?: ValidationError): Promise<boolean> {
    if (expectedError) {
      return expect(this.emailError).toHaveText(expectedError.errorMessage);
    } else {
      return expect(this.emailError).not.toBeVisible();
    }
  }

  async isFormValid(): Promise<boolean> {
    return expect(this.page.locator('.form-error')).not.toBeVisible();
  }
}

const validFormData: FormData = { email: 'test@example.com' };
const invalidEmailData: TestScenario[] = [
  { description: 'Empty email', data: { email: '' }, expectedErrors: [{ fieldName: 'email', errorMessage: 'Please enter a valid email address.' }], shouldSubmit: false },
  { description: 'Invalid email format', data: { email: 'test@example' }, expectedErrors: [{ fieldName: 'email', errorMessage: 'Please enter a valid email address.' }], shouldSubmit: false },
  { description: 'Boundary value - very long email', data: { email: 'a'.repeat(256) + '@example.com' }, expectedErrors: [{ fieldName: 'email', errorMessage: 'Please enter a valid email address.' }], shouldSubmit: false },
  { description: 'Special characters in email', data: { email: 'test@example.com!' }, expectedErrors: [{ fieldName: 'email', errorMessage: 'Please enter a valid email address.' }], shouldSubmit: false }
];

const edgeCaseData: TestScenario[] = [
  { description: 'Whitespace only', data: { email: '   ' }, expectedErrors: [{ fieldName: 'email', errorMessage: 'Please enter a valid email address.' }], shouldSubmit: false },
  { description: 'All digits', data: { email: '1234567890' }, expectedErrors: [{ fieldName: 'email', errorMessage: 'Please enter a valid email address.' }], shouldSubmit: false }
];

test.describe('Policy Form Validation', () => {
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

  test.describe('Individual Field Validation', () => {
    test.each([validFormData, ...invalidEmailData])('should validate $description', async ({ data, expectedErrors, shouldSubmit }) => {
      await policyFormPage.clearEmail();
      await policyFormPage.fillEmail(data.email);
      if (expectedErrors) {
        for (const error of expectedErrors) {
          await expect(policyFormPage.validateEmailError(error)).resolves.toBeTruthy();
        }
      } else {
        await expect(policyFormPage.validateEmailError()).resolves.toBeFalsy();
      }
      if (shouldSubmit) {
        await policyFormPage.submitForm();
        await expect(policyFormPage.isFormValid()).resolves.toBeTruthy();
      } else {
        await expect(policyFormPage.isFormValid()).resolves.toBeFalsy();
      }
    });
  });

  test.describe('Multi-Field Validation', () => {
    // Additional multi-field validation scenarios can be added here
  });

  test.describe('Form Submission Behavior', () => {
    // Additional form submission behavior scenarios can be added here
  });

  test.describe('Error Message Accuracy Verification', () => {
    // Additional error message accuracy verification scenarios can be added here
  });

  test.describe('Success Flow Validation', () => {
    // Additional success flow validation scenarios can be added here
  });
});
