const { test, expect } = require('@playwright/test');

test.describe('Policy Form', () => {
  let page;

  beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://127.0.0.1:5500/policy-form.html');
  });

  test('Valid DOB entry (16 years old)', async () => {
    await page.fill('#dob', '2007-07-18');
    await expect(page).toHaveURL(/policy-form\.html/);
    await expect(page.locator('#dob-error')).toBeHidden();
  });

  test('DOB entry is empty (required validation)', async () => {
    await page.fill('#dob', '');
    await expect(page.locator('#dob-error')).toHaveText('DOB field is required and cannot be empty.');
  });

  test('Invalid DOB entry (not a date)', async () => {
    await page.fill('#dob', 'abc');
    await expect(page.locator('#dob-error')).toHaveText('DOB field must accept only dates.');
  });

  test('DOB entry is less than 16 years old (age requirement)', async () => {
    await page.fill('#dob', '2009-07-18');
    await expect(page.locator('#dob-error')).toHaveText('Minimum age requirement not met.');
  });
});