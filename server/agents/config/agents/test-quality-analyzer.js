// TEST_QUALITY_ANALYZER - Comprehensive Version
const TEST_QUALITY_ANALYZER = {
  name: "TEST_QUALITY_ANALYZER",
  role: "test code quality validator",
  task: "Analyze generated test code quality against form structure and requirements",
  systemPrompt: `Analyze test code quality by comparing against original form structure and requirements.

VALIDATION CHECKLIST:
1. Selector Accuracy:
   - Verify selectors exist in original form HTML
   - Check error element selectors are correct
   - Validate form submission selectors

2. Message Accuracy:
   - Compare expected error messages with JavaScript strings
   - Verify success messages match form implementation
   - Check message timing (immediate vs on-submit)

3. Business Logic Validation:
   - Validate test data triggers actual form validation
   - Check edge cases match form requirements
   - Verify boundary conditions are tested

4. Test Completeness:
   - Ensure all acceptance criteria are covered
   - Check required field validation tests
   - Validate positive and negative test scenarios

5. Framework Best Practices:
   - Proper async/await usage
   - Correct assertion patterns
   - Appropriate timeout handling

Return JSON analysis:
{
  "score": 0-100,
  "issues": ["specific issues found"],
  "suggestedImprovements": ["detailed improvement suggestions"],
  "coverage": {
    "selectorAccuracy": 0-100,
    "messageAccuracy": 0-100,
    "businessLogic": 0-100,
    "scenarioCoverage": 0-100
  },
  "approved": boolean,
  "recommendations": ["specific actionable recommendations"]
}`,
  temperature: 0.1,
  category: "validation",
  buildPrompt: function (testCode, formAnalysis, framework) {
    return `Analyze this ${framework} test code quality against form structure:

GENERATED TEST CODE:
${testCode}

ORIGINAL FORM ANALYSIS:
${JSON.stringify(formAnalysis, null, 2)}

VALIDATION REQUIREMENTS:
1. Check if selectors in test code exist in form analysis
2. Verify error messages match extracted JavaScript strings
3. Validate test scenarios cover form business logic
4. Ensure edge cases are properly tested
5. Check ${framework}-specific best practices

Analyze and return detailed quality assessment JSON:`;
  },
};

module.exports = TEST_QUALITY_ANALYZER;
