# Test info

- Name: Empty Date of Birth Field
- Location: /Users/tigerlab/Documents/Projects/agentic-testing/server/tests/test_auto.spec.js:19:1

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "The date of birth is required and cannot be left blank."
Received string:    "DOB field is required and cannot be empty."
    at /Users/tigerlab/Documents/Projects/agentic-testing/server/tests/test_auto.spec.js:23:24
```

# Page snapshot

```yaml
- main:
  - heading "Policy Form (Test DOB)" [level=2]
  - text: "Date of Birth (DOB):"
  - textbox "Date of Birth (DOB):"
  - button "Submit"
  - text: DOB field is required and cannot be empty.
```

# Test source

```ts
   1 | const { test, expect } = require('@playwright/test');
   2 |
   3 | test('Policy Holder Date of Birth Below Minimum Age', async ({ page }) => {
   4 |   await page.goto('http://127.0.0.1:5500/policy-form.html');
   5 |   await page.fill('#dob', '2008-06-01'); // Assuming current year is 2023
   6 |   await page.click('button[type="submit"]');
   7 |   const errorMessage = await page.textContent('#form-message');
   8 |   expect(errorMessage).toContain('Minimum age for the policy holder must be 16 years.');
   9 | });
  10 |
  11 | test('Policy Holder Date of Birth Above Minimum Age', async ({ page }) => {
  12 |   await page.goto('http://127.0.0.1:5500/policy-form.html');
  13 |   await page.fill('#dob', '2007-06-01'); // Assuming current year is 2023
  14 |   await page.click('button[type="submit"]');
  15 |   const errorMessage = await page.textContent('#form-message');
  16 |   expect(errorMessage).toBeNull();
  17 | });
  18 |
  19 | test('Empty Date of Birth Field', async ({ page }) => {
  20 |   await page.goto('http://127.0.0.1:5500/policy-form.html');
  21 |   await page.click('button[type="submit"]');
  22 |   const errorMessage = await page.textContent('#form-message');
> 23 |   expect(errorMessage).toContain('The date of birth is required and cannot be left blank.');
     |                        ^ Error: expect(received).toContain(expected) // indexOf
  24 | });
  25 |
  26 | test('Valid Date Format Entry', async ({ page }) => {
  27 |   await page.goto('http://127.0.0.1:5500/policy-form.html');
  28 |   await page.fill('#dob', '06/01/2008'); // Assuming current year is 2023
  29 |   await page.click('button[type="submit"]');
  30 |   const errorMessage = await page.textContent('#form-message');
  31 |   expect(errorMessage).toBeNull();
  32 | });
  33 |
  34 | test('Invalid Date Format Entry', async ({ page }) => {
  35 |   await page.goto('http://127.0.0.1:5500/policy-form.html');
  36 |   await page.fill('#dob', '02/30/2008'); // Assuming current year is 2023
  37 |   await page.click('button[type="submit"]');
  38 |   const errorMessage = await page.textContent('#form-message');
  39 |   expect(errorMessage).toContain('The entered date is not valid.');
  40 | });
```