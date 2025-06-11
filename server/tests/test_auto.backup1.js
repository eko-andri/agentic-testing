const { test, expect } = require("@playwright/test");

// Helper untuk ambil error message dengan aman
async function getErrorMessage(page) {
  const messageLocator = page.locator("#form-message");
  await messageLocator
    .waitFor({ state: "visible", timeout: 1000 })
    .catch(() => {});
  const text = await messageLocator.textContent();
  return text?.trim() || null;
}

test("Scenario 1: Verify Minimum Age Validation", async ({ page }) => {
  await page.goto("http://127.0.0.1:5500/policy-form.html");
  await page.fill("#dob", "2010-01-01"); // Umur < 16 tahun pada 2025
  await page.click('button[type="submit"]');
  const errorMessage = await getErrorMessage(page);
  expect(errorMessage).toContain("Minimum age requirement not met.");
});

test("Scenario 2: Validate Date Format", async ({ page }) => {
  await page.goto("http://127.0.0.1:5500/policy-form.html");
  await page.fill("#dob", "2000-01-01");
  await page.click('button[type="submit"]');
  const errorMessage = await getErrorMessage(page);
  expect(errorMessage).toBe("Form submitted successfully.");
});

test("Scenario 3: Ensure DOB Field is Required", async ({ page }) => {
  await page.goto("http://127.0.0.1:5500/policy-form.html");
  await page.click('button[type="submit"]');
  const errorMessage = await getErrorMessage(page);
  expect(errorMessage).toContain("DOB field is required and cannot be empty.");
});

test("Scenario 4: Verify Previous Validation Rules", async ({ page }) => {
  await page.goto("http://127.0.0.1:5500/policy-form.html");
  await page.fill("#dob", "2000-01-01");
  await page.click('button[type="submit"]');
  const errorMessage = await getErrorMessage(page);
  expect(errorMessage).toBe("Form submitted successfully.");
});

test("Scenario 5: Test Valid Date Entry", async ({ page }) => {
  await page.goto("http://127.0.0.1:5500/policy-form.html");
  await page.fill("#dob", "2009-06-11"); // Umur tepat 16 tahun pada hari ini (2025-06-11)
  await page.click('button[type="submit"]');
  const errorMessage = await getErrorMessage(page);
  expect(errorMessage).toBe("Form submitted successfully.");
});
