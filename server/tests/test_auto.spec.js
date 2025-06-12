const { test, expect } = require("@playwright/test");

async function getErrorMessage(page) {
  const messageLocator = page.locator("#form-message");
  await messageLocator
    .waitFor({ state: "visible", timeout: 1000 })
    .catch(() => {});
  const text = await messageLocator.textContent();
  return text?.trim() || null;
}

test("Valid DOB Input", async ({ page }) => {
  await page.goto("http://127.0.0.1:5500/policy-form.html");

  // Calculate valid date for age requirement
  const today = new Date();
  const validDate = new Date(
    today.getFullYear() - 20,
    today.getMonth(),
    today.getDate()
  );
  await page.locator("#dob").fill(validDate.toISOString().split("T")[0]);

  await page.locator("button[type='submit']").click();

  // For success scenario, expect success message
  const message = await getErrorMessage(page);
  expect(message).toContain("Form submitted successfully.");
});

test("Invalid DOB Input (Age < 16)", async ({ page }) => {
  await page.goto("http://127.0.0.1:5500/policy-form.html");

  // Calculate underage date (less than required age)
  const today = new Date();
  const underageDate = new Date(
    today.getFullYear() - 15,
    today.getMonth(),
    today.getDate()
  );
  await page.locator("#dob").fill(underageDate.toISOString().split("T")[0]);

  await page.locator("button[type='submit']").click();

  // For error scenario, expect error message
  const errorMessage = await getErrorMessage(page);
  expect(errorMessage).toBe("Minimum age requirement not met.");
});

test("Empty DOB Field", async ({ page }) => {
  await page.goto("http://127.0.0.1:5500/policy-form.html");

  // Test empty date field
  await page.locator("#dob").clear();

  await page.locator("button[type='submit']").click();

  // For error scenario, expect error message
  const errorMessage = await getErrorMessage(page);
  expect(errorMessage).toBe("DOB field is required and cannot be empty.");
});

test("Invalid Date Format Input", async ({ page }) => {
  await page.goto("http://127.0.0.1:5500/policy-form.html");

  // Test invalid date input
  const dobField = page.locator("#dob");
  await dobField.fill("2020-01-01");
  await page.evaluate(() => {
    const input = document.getElementById("dob");
    Object.defineProperty(input, "value", {
      get: function () {
        return "invalid-date-string";
      },
      configurable: true,
    });
  });

  await page.locator("button[type='submit']").click();

  // For error scenario, expect error message
  const errorMessage = await getErrorMessage(page);
  expect(errorMessage).toBe("DOB field must accept only dates.");
});

test("Valid DOB Input with Previous Validation", async ({ page }) => {
  await page.goto("http://127.0.0.1:5500/policy-form.html");

  // Calculate valid date for age requirement
  const today = new Date();
  const validDate = new Date(
    today.getFullYear() - 20,
    today.getMonth(),
    today.getDate()
  );
  await page.locator("#dob").fill(validDate.toISOString().split("T")[0]);

  await page.locator("button[type='submit']").click();

  // For success scenario, expect success message
  const message = await getErrorMessage(page);
  expect(message).toContain("Form submitted successfully.");
});
