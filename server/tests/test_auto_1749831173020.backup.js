<think></think>;

const { test, expect } = require("@playwright/test");

async function getErrorMessage(page) {
  const messageLocator = page.locator("#form-message");
  await messageLocator
    .waitFor({ state: "visible", timeout: 1000 })
    .catch(() => {});
  const text = await messageLocator.textContent();
  return text?.trim() || null;
}

test("Valid DOB exactly 16 years old", async ({ page }) => {
  await page.goto("http://127.0.0.1:5500/policy-form.html");
  const today = new Date();
  const validDate = new Date(
    today.getFullYear() - 20,
    today.getMonth(),
    today.getDate()
  );
  await page.locator("#dob").fill(validDate.toISOString().split("T")[0]);
  await page.locator("button[type='submit']").click();
  const message = await getErrorMessage(page);
  expect(message).toContain("Form submitted successfully.");
});

test("DOB under 16 years old", async ({ page }) => {
  await page.goto("http://127.0.0.1:5500/policy-form.html");
  const today = new Date();
  const underageDate = new Date(
    today.getFullYear() - 15,
    today.getMonth(),
    today.getDate()
  );
  await page.locator("#dob").fill(underageDate.toISOString().split("T")[0]);
  await page.locator("button[type='submit']").click();
  const message = await getErrorMessage(page);
  expect(message).toBe("Minimum age requirement not met.");
});

test("Empty DOB field", async ({ page }) => {
  await page.goto("http://127.0.0.1:5500/policy-form.html");
  await page.locator("#dob").clear();
  await page.locator("button[type='submit']").click();
  const message = await getErrorMessage(page);
  expect(message).toBe("DOB field is required and cannot be empty.");
});

test("Invalid DOB format", async ({ page }) => {
  await page.goto("http://127.0.0.1:5500/policy-form.html");
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
  const message = await getErrorMessage(page);
  expect(message).toBe("DOB format is invalid.");
});
