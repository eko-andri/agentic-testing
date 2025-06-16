// Framework Templates Configuration
const FRAMEWORK_TEMPLATES = {
  playwright: {
    imports: `const { test, expect } = require('@playwright/test');`,
    helpers: `
// Helper function to calculate dates based on current year (${new Date().getFullYear()})
function getDateForAge(ageYears, monthsOffset = 0, daysOffset = 0) {
  const now = new Date();
  const targetDate = new Date(
    now.getFullYear() - ageYears, 
    now.getMonth() + monthsOffset, 
    now.getDate() + daysOffset
  );
  return targetDate.toISOString().split('T')[0];
}

async function waitForErrorMessage(page, errorSelector, timeout = 3000) {
  try {
    const errorLocator = page.locator(errorSelector);
    await errorLocator.waitFor({ state: 'visible', timeout });
    const text = await errorLocator.textContent();
    return text && text.trim() !== '' ? text.trim() : null;
  } catch (error) {
    return null;
  }
}

async function waitForSuccessMessage(page, messageSelector, timeout = 3000) {
  try {
    const messageLocator = page.locator(messageSelector);
    await messageLocator.waitFor({ state: 'visible', timeout });
    const text = await messageLocator.textContent();
    return text && text.trim() !== '' ? text.trim() : null;
  } catch (error) {
    return null;
  }
}

async function fillFieldAndWaitForValidation(page, fieldSelector, value, validationDelay = 100) {
  await page.locator(fieldSelector).waitFor({ state: 'visible' });
  await page.locator(fieldSelector).clear();
  await page.locator(fieldSelector).fill(value);
  // Wait for real-time validation to trigger
  await page.waitForTimeout(validationDelay);
}

async function submitFormAndWait(page, submitSelector = 'button[type="submit"]', waitTime = 300) {
  await page.locator(submitSelector).click();
  await page.waitForTimeout(waitTime);
}

async function verifyNoErrorMessage(page, errorSelector) {
  const errorText = await page.locator(errorSelector).textContent();
  return !errorText || errorText.trim() === '';
}`,
    testStructure: (testUrl) => `test.describe('Form Validation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('${testUrl}');
  });

  // Test cases will be generated here
});`,
  },

  cypress: {
    imports: `/// <reference types="cypress" />`,
    helpers: `
function getDateForAge(ageYears, monthsOffset = 0, daysOffset = 0) {
  const now = new Date();
  const targetDate = new Date(
    now.getFullYear() - ageYears, 
    now.getMonth() + monthsOffset, 
    now.getDate() + daysOffset
  );
  return targetDate.toISOString().split('T')[0];
}

function waitForErrorMessage(errorSelector, timeout = 3000) {
  return cy.get(errorSelector, { timeout })
    .should('be.visible')
    .invoke('text')
    .then(text => text && text.trim() !== '' ? text.trim() : null);
}

function fillFieldAndWaitForValidation(fieldSelector, value, validationDelay = 100) {
  cy.get(fieldSelector).should('be.visible').clear().type(value);
  cy.wait(validationDelay);
}

function submitFormAndWait(submitSelector = 'button[type="submit"]', waitTime = 300) {
  cy.get(submitSelector).click();
  cy.wait(waitTime);
}`,
    testStructure: (testUrl) => `describe('Form Validation Tests', () => {
  beforeEach(() => {
    cy.visit('${testUrl}');
  });

  // Test cases will be generated here
});`,
  },

  selenium: {
    imports: `const { Builder, By, until, Key } = require('selenium-webdriver');`,
    helpers: `
function getDateForAge(ageYears, monthsOffset = 0, daysOffset = 0) {
  const now = new Date();
  const targetDate = new Date(
    now.getFullYear() - ageYears, 
    now.getMonth() + monthsOffset, 
    now.getDate() + daysOffset
  );
  return targetDate.toISOString().split('T')[0];
}

async function waitForErrorMessage(driver, errorSelector, timeout = 3000) {
  try {
    const element = await driver.wait(
      until.elementLocated(By.css(errorSelector)),
      timeout
    );
    const text = await element.getText();
    return text && text.trim() !== '' ? text.trim() : null;
  } catch (error) {
    return null;
  }
}

async function fillFieldAndWaitForValidation(driver, fieldSelector, value, validationDelay = 100) {
  const element = await driver.wait(until.elementLocated(By.css(fieldSelector)), 5000);
  await element.clear();
  await element.sendKeys(value);
  await driver.sleep(validationDelay);
}

async function submitFormAndWait(driver, submitSelector = 'button[type="submit"]', waitTime = 300) {
  const submitButton = await driver.findElement(By.css(submitSelector));
  await submitButton.click();
  await driver.sleep(waitTime);
}`,
    testStructure: (testUrl) => `describe('Form Validation Tests', () => {
  let driver;

  beforeEach(async () => {
    driver = await new Builder().forBrowser('chrome').build();
    await driver.get('${testUrl}');
  });

  afterEach(async () => {
    await driver.quit();
  });

  // Test cases will be generated here
});`,
  },
};

module.exports = {
  FRAMEWORK_TEMPLATES,
};
