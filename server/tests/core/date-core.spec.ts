<think>
Okay, let's tackle this problem. The user wants a comprehensive Playwright test for a date of birth field in a form. The main goal is to validate the date field's behavior, including required checks, format validation, and error messages.

First, I need to structure the TypeScript code properly. The user specified using the Page Object Model, so I'll create a class for the form page. The class should have locators for the date field and its error message. The constructor will initialize these locators using the provided Page object.

Next, the interfaces. The FormData interface should include the dob field as a string. ValidationError will map field names to their error messages. TestScenario needs to have input data, expected errors, and any other relevant info.

For test data, I'll create valid data with a proper date. Then invalid cases: empty, wrong format, future date. Each should have expected error messages. Also, edge cases like boundary dates (like 1900-01-01) and special characters that might be incorrectly entered.

The test suite needs multiple describe blocks. One for setup, then individual tests for each scenario. Using test.each for data-driven tests makes sense here. Each test case will fill the form, submit, and check for errors. Also, check the global error message when applicable.

I should include tests for form submission behavior—ensuring submission is blocked when there are errors and allowed when valid. Also, check that error messages appear on blur and submission.

I need to make sure all methods in the Page Object are async and use proper typing. Methods like fillForm, submitForm, and getErrorMessages will be essential. Also, a method to check if the form is valid.

Error handling is important. Using expect to check for visibility and text content of error messages. Also, ensuring that the form submission only proceeds when valid.

Wait, the user mentioned validation triggers on blur and submit. So tests should include triggering blur events to check immediate feedback. Maybe add a test where filling the field correctly after an error removes the error message.

Also, cross-browser considerations—though Playwright handles that by running tests in different browsers, the tests themselves should be written to be compatible.

Putting it all together: imports, interfaces, Page Object class, test data, setup with beforeEach, and the test cases. Make sure all assertions are precise, using Playwright's expect methods for visibility and text checks.

Need to avoid any forbidden patterns like waitForSelector. Instead, use assertions that wait for the elements to be in the correct state. Also, no hardcoded delays.

Finally, ensure the code is clean, with proper typing throughout, and follows the AAA (Arrange, Act, Assert) pattern in test names for clarity.
</think>

import { test, expect, Page, Locator } from '@playwright/test';

interface FormData {
  dob: string;
}

interface ValidationError {
  [key: string]: string;
}

interface TestScenario {
  description: string;
  input: FormData;
  expectedErrors: ValidationError;
  expectSuccess?: boolean;
}

class PolicyFormPage {
  readonly page: Page;
  readonly dobField: Locator;
  readonly dobError: Locator;
  readonly globalError: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dobField = page.locator('#dob');
    this.dobError = page.locator('#dob-error');
    this.globalError = page.locator('.form-global-error');
    this.submitButton = page.locator('button[type="submit"]');
  }

  async navigate(): Promise<void> {
    await this.page.goto('http://localhost:5500/policy-form.html');
  }

  async fillForm(data: FormData): Promise<void> {
    await this.dobField.fill(data.dob);
  }

  async submitForm(): Promise<void> {
    await this.submitButton.click();
  }

  async clearForm(): Promise<void> {
    await this.dobField.clear();
  }

  async getDobErrorText(): Promise<string> {
    return await this.dobError.textContent() || '';
  }

  async getGlobalErrorText(): Promise<string> {
    return await this.globalError.textContent() || '';
  }

  async isFormValid(): Promise<boolean> {
    return await this.submitButton.isEnabled();
  }
}

const VALID_DATA: FormData = { dob: '1990-01-01' };
const INVALID_SCENARIOS: TestScenario[] = [
  {
    description: 'Empty date field',
    input: { dob: '' },
    expectedErrors: { dob: 'Date of birth is required' }
  },
  {
    description: 'Invalid date format',
    input: { dob: '01/01/1990' },
    expectedErrors: { dob: 'Invalid date format. Use YYYY-MM-DD' }
  },
  {
    description: 'Future date',
    input: { dob: '2030-01-01' },
    expectedErrors: { dob: 'Date must not be in the future' }
  },
  {
    description: 'Special characters',
    input: { dob: '1990-01-01!' },
    expectedErrors: { dob: 'Invalid date format. Use YYYY-MM-DD' }
  }
];

test.beforeEach(async ({ page }) => {
  const formPage = new PolicyFormPage(page);
  await formPage.navigate();
  await formPage.clearForm();
});

test.describe('Date of Birth Validation', () => {
  test('should accept valid date format', async ({ page }) => {
    const formPage = new PolicyFormPage(page);
    await formPage.fillForm(VALID_DATA);
    await formPage.submitForm();
    await expect(formPage.globalError).not.toBeVisible();
    await expect(formPage.dobError).not.toBeVisible();
    await expect(formPage.submitButton).toBeEnabled();
  });

  test('should show error on empty date field', async ({ page }) => {
    const formPage = new PolicyFormPage(page);
    await formPage.submitForm();
    await expect(formPage.dobError).toHaveText('Date of birth is required');
    await expect(formPage.globalError).toHaveText('Please fix the errors above before submitting');
    await expect(formPage.submitButton).toBeDisabled();
  });

  test('should validate date format on blur', async ({ page }) => {
    const formPage = new PolicyFormPage(page);
    await formPage.dobField.fill('01/01/1990');
    await formPage.dobField.blur();
    await expect(formPage.dobError).toHaveText('Invalid date format. Use YYYY-MM-DD');
  });

  test('should prevent submission with multiple errors', async ({ page }) => {
    const formPage = new PolicyFormPage(page);
    await formPage.fillForm({ dob: '2030-01-01' });
    await formPage.submitForm();
    await expect(formPage.dobError).toHaveText('Date must not be in the future');
    await expect(formPage.globalError).toBeVisible();
    await expect(formPage.submitButton).toBeDisabled();
  });

  test('should clear errors when valid input after error', async ({ page }) => {
    const formPage = new PolicyFormPage(page);
    await formPage.fillForm({ dob: '01/01/1990' });
    await formPage.dobField.blur();
    await expect(formPage.dobError).toHaveText('Invalid date format. Use YYYY-MM-DD');
    await formPage.fillForm(VALID_DATA);
    await expect(formPage.dobError).not.toBeVisible();
  });
});

test.describe('Data-Driven Validation Scenarios', () => {
  test.each(INVALID_SCENARIOS)('$description', async ({ input, expectedErrors }, testInfo) => {
    const formPage = new PolicyFormPage(page);
    await formPage.fillForm(input);
    await formPage.submitForm();
    
    for (const [field, message] of Object.entries(expectedErrors)) {
      const errorLocator = formPage.page.locator(`#${field}-error`);
      await expect(errorLocator).toHaveText(message);
    }
    
    await expect(formPage.globalError).toHaveText('Please fix the errors above before submitting');
    await expect(formPage.submitButton).toBeDisabled();
  });
});

test.describe('Form Submission Behavior', () => {
  test('should enable submission when all validations pass', async ({ page }) => {
    const formPage = new PolicyFormPage(page);
    await formPage.fillForm(VALID_DATA);
    await expect(formPage.submitButton).toBeEnabled();
  });

  test('should block submission with empty form', async ({ page }) => {
    const formPage = new PolicyFormPage(page);
    await formPage.submitForm();
    await expect(formPage.submitButton).toBeDisabled();
  });

  test('should show global error for multiple validation failures', async ({ page }) => {
    const formPage = new PolicyFormPage(page);
    await formPage.fillForm({ dob: '2030-01-01' });
    await formPage.submitForm();
    await expect(formPage.globalError).toBeVisible();
    await expect(formPage.dobError).toHaveText('Date must not be in the future');
  });
});