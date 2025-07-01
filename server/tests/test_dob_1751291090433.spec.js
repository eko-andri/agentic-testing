const { test, expect } = require('@playwright/test');

test.describe('Policy Form Test', () => {
  test('should validate date of birth field with valid input', async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/policy-form.html');
    const dobInput = page.locator('#dob');
    const errorMessage = page.locator('#dob-error');

    await dobInput.fill('01/01/2006'); // Boundary value for minimum age
    await expect(errorMessage).not.toBeVisible();
  });

  test('should validate date of birth field with invalid input', async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/policy-form.html');
    const dobInput = page.locator('#dob');
    const errorMessage = page.locator('#dob-error');

    await dobInput.fill('31/12/1999'); // Below minimum age
    await expect(errorMessage).toBeVisible();
  });

  test('should validate email field with valid input', async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/policy-form.html');
    const emailInput = page.locator('#email');
    const errorMessage = page.locator('#email-error');

    await emailInput.fill('test@example.com');
    await expect(errorMessage).not.toBeVisible();
  });

  test('should validate email field with invalid input', async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/policy-form.html');
    const emailInput = page.locator('#email');
    const errorMessage = page.locator('#email-error');

    await emailInput.fill('test@domain');
    await expect(errorMessage).toBeVisible();
  });

  test('should validate mobile number field with valid input', async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/policy-form.html');
    const mobileInput = page.locator('#mobile');
    const errorMessage = page.locator('#mobile-error');

    await mobileInput.fill('0812-3456-7890');
    await expect(errorMessage).not.toBeVisible();
  });

  test('should validate mobile number field with invalid input', async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/policy-form.html');
    const mobileInput = page.locator('#mobile');
    const errorMessage = page.locator('#mobile-error');

    await mobileInput.fill('abc-def-ghi');
    await expect(errorMessage).toBeVisible();
  });

  test('should show error message for empty date of birth field', async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/policy-form.html');
    const dobInput = page.locator('#dob');
    const errorMessage = page.locator('#dob-error');

    await dobInput.fill('');
    await expect(errorMessage).toBeVisible();
  });

  test('should show error message for empty email field', async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/policy-form.html');
    const emailInput = page.locator('#email');
    const errorMessage = page.locator('#email-error');

    await emailInput.fill('');
    await expect(errorMessage).toBeVisible();
  });

  test('should show error message for empty mobile number field', async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/policy-form.html');
    const mobileInput = page.locator('#mobile');
    const errorMessage = page.locator('#mobile-error');

    await mobileInput.fill('');
    await expect(errorMessage).toBeVisible();
  });

  test('should prevent form submission with validation errors', async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/policy-form.html');
    const dobInput = page.locator('#dob');
    const emailInput = page.locator('#email');
    const mobileInput = page.locator('#mobile');
    const submitButton = page.locator('#submit');

    await dobInput.fill('');
    await emailInput.fill('');
    await mobileInput.fill('');

    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    const generalErrorMessage = page.locator('#general-error');
    await expect(generalErrorMessage).toBeVisible();
  });

  test('should clear error messages when input is corrected', async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/policy-form.html');
    const dobInput = page.locator('#dob');
    const emailInput = page.locator('#email');
    const mobileInput = page.locator('#mobile');
    const errorMessage = page.locator('#dob-error');

    await dobInput.fill('');
    await expect(errorMessage).toBeVisible();

    await dobInput.fill('01/01/2006');
    await expect(errorMessage).not.toBeVisible();
  });
});