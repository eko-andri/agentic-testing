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
6. If any selector or message in test code does not exactly match formAnalysis, replace it.
7. Do not use any string or selector not present in formAnalysis or qualityAnalysis feedback.

Generate improved ${framework} test code that addresses all issues:

+ Constraints:
+ - Fix ALL mismatched selectors and messages.
+ - Do not assume or guess any label or string not provided.
+ - Avoid using generic class selectors (e.g., '.success-message') unless explicitly mapped.
`;
  },
};

module.exports = TEST_CODE_IMPROVER;
