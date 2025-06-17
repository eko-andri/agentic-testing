// TEST_CODE_IMPROVER - Comprehensive Version
const TEST_CODE_IMPROVER = {
  name: "TEST_CODE_IMPROVER",
  role: "test code enhancement specialist",
  task: "Generate improved test code based on quality analysis feedback",
  systemPrompt: `Improve test code based on quality analysis feedback and form context.

IMPROVEMENT AREAS:
1. Selector Fixes:
   - Replace incorrect selectors with verified ones from form
   - Use exact IDs and classes from HTML
   - Fix form submission selectors

2. Message Corrections:
   - Update error message expectations to match JavaScript
   - Use exact strings from form validation code
   - Fix success message expectations

3. Business Logic Enhancement:
   - Add missing edge case tests
   - Implement proper boundary testing
   - Add validation for business rules (age, format, etc.)

4. Code Quality Improvements:
   - Add helper functions for dynamic data
   - Improve async/await patterns
   - Optimize test structure and organization

5. Coverage Enhancements:
   - Add missing test scenarios
   - Implement positive and negative cases
   - Cover all acceptance criteria

Generate improved test code that addresses all identified issues.
Return clean executable test code without markdown or explanations.`,
  temperature: 0.1,
  category: "improvement",
  buildPrompt: function (
    currentCode,
    qualityAnalysis,
    formAnalysis,
    framework
  ) {
    return `Improve this ${framework} test code based on quality analysis:

CURRENT TEST CODE:
${currentCode}

QUALITY ANALYSIS FEEDBACK:
${JSON.stringify(qualityAnalysis, null, 2)}

FORM ANALYSIS CONTEXT:
${JSON.stringify(formAnalysis, null, 2)}

IMPROVEMENT REQUIREMENTS:
1. Fix selector issues identified in quality analysis
2. Correct error message expectations to match form JavaScript
3. Add missing test scenarios for complete coverage
4. Implement suggested improvements for business logic
5. Optimize code structure and add helper functions

Generate improved ${framework} test code that addresses all issues:`;
  },
};

// HELPER: Test Quality Configuration
const TEST_QUALITY_CONFIG = {
  qualityThresholds: {
    excellent: 90,
    good: 80,
    acceptable: 70,
    needsImprovement: 60,
    poor: 50,
  },

  coverageRequirements: {
    selectorAccuracy: 95, // Must use correct selectors
    messageAccuracy: 90, // Must match exact error messages
    businessLogic: 85, // Must test form validation rules
    scenarioCoverage: 80, // Must cover acceptance criteria
  },

  frameworkBestPractices: {
    playwright: [
      "Use proper async/await patterns",
      "Use page.locator() for element selection",
      "Use expect().toHaveText() for exact message matching",
      "Add proper timeouts for async operations",
      "Use beforeEach for test setup",
    ],
    cypress: [
      "Use cy.get() for element selection",
      "Use cy.should() for assertions",
      "Implement proper wait strategies",
      "Use custom commands for repeated actions",
    ],
    selenium: [
      "Use proper WebDriver wait conditions",
      "Implement Page Object Model patterns",
      "Use explicit waits over implicit waits",
      "Handle browser-specific behaviors",
    ],
  },

  commonIssues: {
    selectorProblems: [
      "Using generic selectors like '.error' instead of specific '#field-error'",
      "Incorrect form submission selectors",
      "Non-existent element selectors",
    ],
    messageProblems: [
      "Generic error messages vs exact JavaScript strings",
      "Wrong success message expectations",
      "Missing message validation",
    ],
    logicProblems: [
      "Hardcoded dates instead of dynamic calculations",
      "Missing boundary condition tests",
      "Incomplete business rule validation",
    ],
  },
};

module.exports = TEST_CODE_IMPROVER;
