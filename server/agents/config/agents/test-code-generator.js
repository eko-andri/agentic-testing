// FIXED Test Code Generator - Clean Implementation
const TEST_CODE_GENERATOR = {
  name: "TEST_CODE_GENERATOR",
  role: "test automation code generator",
  task: "Convert form analysis into executable test code",
  systemPrompt: `Generate Playwright test code using COMPLETE selector and message mapping from analysis.

Use EXACT information from analysis:
- Use step.fieldSelector for form field interactions
- Use step.errorSelector for error element verification
- Use step.expectedText for exact message verification
- Use selectorMapping for any missing selectors
- Use messageMapping for any missing messages

+ Do NOT use selectors or messages that are not explicitly provided.
+ Do NOT invent or assume success message selectors if not present.
+ Do NOT rephrase or paraphrase expectedText.

Generate proper Playwright test structure with test.describe() and test() blocks.
Use async/await patterns and proper expect() assertions.
Include helper functions only if needed by the scenarios.
Return clean executable test code without markdown.`,
  temperature: 0.1,
  category: "generation",
  buildPrompt: function (formAnalysis, testUrl, framework, options) {
    return `Generate ${framework} test code using COMPLETE selector mapping:

Test URL: ${testUrl}

Form Analysis with Complete Mapping:
${JSON.stringify(formAnalysis, null, 2)}

Requirements:
1. Use exact selectors from step.fieldSelector and step.errorSelector
2. Use exact messages from step.expectedText
3. Generate proper test.describe() and test() structure
4. Create helper functions based on business logic (e.g., getDateForAge if date calculations present)
5. Use step.action to determine test actions (fill, click, verify, submit)
6. Use step.shouldBeVisible for element visibility assertions

+ Constraints:
+ - Do not invent new selectors or messages.
+ - Do not modify any step.expectedText or selector.
+ - If selector or expectedText is missing, skip assertion.

Example test structure:
test.describe('Form Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('${testUrl}');
  });
  
  // For each scenario in recommendedTestScenarios, generate:
  // test('scenario description', async ({ page }) => {
  //   // Implement each step using exact selectors
  // });
});

Generate complete working test code:`;
  },
};

module.exports = TEST_CODE_GENERATOR;
