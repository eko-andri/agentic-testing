// testReviewUtils.js
// Utility for analyzing Playwright test scripts for quality and correctness.

/**
 * Analyze a Playwright test script for common issues, best practices, and completeness.
 * @param {string} testCode - The Playwright test code to analyze.
 * @returns {{ issues: string[] }}
 */
function analyzePlaywrightTest(testCode) {
  const issues = [];

  // Check for basic Playwright test structure
  if (!/test\(/.test(testCode)) {
    issues.push("No Playwright test() function found.");
  }
  if (!/expect\(/.test(testCode)) {
    issues.push("No assertions (expect) found in the test.");
  }
  // Check for missing describe block (optional, but good practice)
  if (!/describe\(/.test(testCode)) {
    issues.push("No describe() block found. Consider grouping tests.");
  }
  // Check for hardcoded waits (bad practice)
  if (/waitForTimeout|setTimeout/.test(testCode)) {
    issues.push(
      "Avoid using hardcoded waits (waitForTimeout/setTimeout). Use proper Playwright waiting mechanisms."
    );
  }
  // Check for missing page.goto
  if (!/page\.goto\(/.test(testCode)) {
    issues.push("No page navigation (page.goto) found.");
  }
  // Check for missing selectors
  if (!/page\.(click|fill|type|check|uncheck|selectOption)\(/.test(testCode)) {
    issues.push("No user interaction (click/fill/type/etc) found.");
  }
  // Add more checks as needed for your standards

  return { issues };
}

module.exports = { analyzePlaywrightTest };
