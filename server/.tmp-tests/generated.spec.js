const { test, expect } = require('@playwright/test');

test.describe('Policy Form', () => {
  let page;

  beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://127.0.0.1:5500/D:/Projects/agentic-testing/policy-form.html');
  });

  test('DOB field is required and shows an error message when left blank', async () => {
    await page.fill('#dob', '');
    await expect(page.locator('#dob-error')).toBeVisible();
    const errorMessage = await page.textContent('#dob-error');
    expect(errorMessage).toContain('DOB field is required and cannot be empty.');
  });

  test('DOB field accepts valid date formats and does not show an invalid format error for correct inputs', async () => {
    await page.fill('#dob', '2009-06-18');
    await expect(page.locator('#dob-error')).not.toBeVisible();
  });

  test('DOB field enforces minimum age requirement of 16 years and shows an appropriate error message', async () => {
    await page.fill('#dob', '2013-06-18');
    await expect(page.locator('#dob-error')).toBeVisible();
    const errorMessage = await page.textContent('#dob-error');
    expect(errorMessage).toContain('DOB field must accept only dates.');
  });

  test('Form submission with valid DOB', async () => {
    await page.fill('#dob', '2009-06-18');
    await page.click('#policy-form');
    await expect(page.locator('#form-submission-message')).toBeVisible();
    const successMessage = await page.textContent('#form-submission-message');
    expect(successMessage).toContain('Form submitted successfully.');
  });
});