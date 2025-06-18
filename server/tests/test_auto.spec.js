const { test, expect } = require('@playwright/test');

test.describe('Form Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('file:///Users/tigerlab/Documents/Projects/agentic-testing/policy-form.html');
  });

  test('User submits form with valid DOB', async ({ page }) => {
    await page.fill('#dob', '2007-06-18');
    await page.click('button[type="submit"]');
    expect(await page.textContent('.success-message')).toBe('Form submitted successfully.');
  });

  test('User submits form with empty DOB', async ({ page }) => {
    await page.fill('#dob', '');
    await page.click('button[type="submit"]');
    expect(await page.textContent('#dob-error')).toBe('DOB field is required and cannot be empty.');
  });

  test('User submits form with invalid DOB format', async ({ page }) => {
    await page.fill('#dob', '2009/06/18');
    await page.click('button[type="submit"]');
    expect(await page.textContent('#dob-error')).toBe('DOB format is invalid.');
  });

  test('User submits form with DOB less than 16 years old', async ({ page }) => {
    const dob = getDateForAge(15);
    await page.fill('#dob', dob);
    await page.click('button[type="submit"]');
    expect(await page.textContent('#dob-error')).toBe('You must be at least 16 years old.');
  });
});

// Helper function to get date for a specific age
function getDateForAge(age) {
  const today = new Date();
  const birthYear = today.getFullYear() - age;
  return `${birthYear}-01-01`;
}