const { test, expect } = require('@playwright/test');

test('Scenario 1: Verify Minimum Age Requirement', async ({ page }) => {
  await page.goto('http://127.0.0.1:5500/policy-form.html');
  await page.fill('#dob', '2010-01-01'); // Assuming today is 2023-04-01
  await page.click('#submit');
  await expect(page.locator('.error-message')).toContainText('Minimum age requirement not met');
});

test('Scenario 2: Verify Date Format Validation', async ({ page }) => {
  await page.goto('http://127.0.0.1:5500/policy-form.html');
  await page.fill('#dob', 'not-a-date');
  await page.click('#submit');
  await expect(page.locator('.error-message')).toContainText('DOB field must accept only dates');
});

test('Scenario 3: Verify Required Field Validation', async ({ page }) => {
  await page.goto('http://127.0.0.1:5500/policy-form.html');
  await page.click('#submit');
  await expect(page.locator('.error-message')).toContainText('DOB field is required and cannot be empty');
});

test('Scenario 4: Verify Previous Validation Still Works', async ({ page }) => {
  await page.goto('http://127.0.0.1:5500/policy-form.html');
  await page.fill('#dob', '2010-01-01'); // Assuming today is 2023-04-01
  await page.click('#submit');
  await expect(page.locator('.error-message')).toContainText('Minimum age requirement not met');
});

test('Scenario 5: Verify Correct DOB Entry', async ({ page }) => {
  await page.goto('http://127.0.0.1:5500/policy-form.html');
  await page.fill('#dob', '1997-04-01'); // Assuming today is 2023-04-01
  await page.click('#submit');
  await expect(page.locator('.error-message')).not.toBeVisible();
});