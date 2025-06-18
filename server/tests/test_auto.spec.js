const { test, expect } = require("@playwright/test");

test.describe("Form Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "file:///Users/tigerlab/Documents/Projects/agentic-testing/policy-form.html"
    );
  });

  test("User submits form with valid DOB", async ({ page }) => {
    await page.fill("#dob", "2009-06-18");
    await page.click("#policy-form");
    const successMessage = await page.textContent(".success-message"); // Assuming a class for success message
    expect(successMessage).toBe("Form submitted successfully.");
  });

  test("User submits form with empty DOB", async ({ page }) => {
    await page.fill("#dob", "");
    await page.click("#policy-form");
    const errorMessage = await page.textContent("#dob-error");
    expect(errorMessage).toBe("DOB field is required and cannot be empty.");
  });

  test("User submits form with invalid DOB format", async ({ page }) => {
    await page.fill("#dob", "2025-13-01");
    await page.click("#policy-form");
    const errorMessage = await page.textContent("#dob-error");
    expect(errorMessage).toBe("DOB format is invalid.");
  });

  test("User submits form with DOB less than 16 years old", async ({
    page,
  }) => {
    await page.fill("#dob", "2005-06-18");
    await page.click("#policy-form");
    const errorMessage = await page.textContent("#dob-error");
    expect(errorMessage).toBe("DOB must be at least 16 years old.");
  });

  test("User submits form with valid DOB and additional fields", async ({
    page,
  }) => {
    await page.fill("#dob", "2009-06-18");
    await page.fill("#name", "John Doe");
    await page.fill("#email", "john.doe@example.com");
    await page.click("#policy-form");
    const successMessage = await page.textContent(".success-message"); // Assuming a class for success message
    expect(successMessage).toBe("Form submitted successfully.");
  });

  test("User submits form with empty additional fields", async ({ page }) => {
    await page.fill("#dob", "2009-06-18");
    await page.fill("#name", "");
    await page.fill("#email", "");
    await page.click("#policy-form");
    const errorMessage = await page.textContent("#name-error");
    expect(errorMessage).toBe("Name field is required and cannot be empty.");
    const emailErrorMessage = await page.textContent("#email-error");
    expect(emailErrorMessage).toBe(
      "Email field is required and cannot be empty."
    );
  });

  test("User submits form with invalid email format", async ({ page }) => {
    await page.fill("#dob", "2009-06-18");
    await page.fill("#name", "John Doe");
    await page.fill("#email", "john.doe@examplecom");
    await page.click("#policy-form");
    const errorMessage = await page.textContent("#email-error");
    expect(errorMessage).toBe("Email format is invalid.");
  });
});
