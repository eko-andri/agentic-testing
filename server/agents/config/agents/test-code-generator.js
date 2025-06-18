// Refactored TEST_CODE_GENERATOR to support dynamic inputs (initial + analyzer feedback)

const TEST_CODE_GENERATOR = {
  name: "TEST_CODE_GENERATOR",
  role: "test automation code generator",
  task: "Convert form analysis or failed test feedback into executable test code",
  systemPrompt: `Generate Playwright test code using ONLY the provided analysis or failed test details.

If formAnalysis.recommendedTestScenarios exists, generate full tests.
If failedScenarios is provided instead, preserve working tests and regenerate failed ones.

Rules:
- Use step.fieldSelector for form field interactions
- Use step.errorSelector and expectedText for error checks
- Use selectorMapping and messageMapping when present
- Wrap all test cases inside test.describe() with a working beforeEach()
- Use async/await and expect() from @playwright/test
- Do not re-generate successful test cases
- Do not include markdown, explanation, or console output — only valid test code.

Always ensure generated code is executable.
Return clean JavaScript code ONLY.`,
  temperature: 0.1,
  category: "generation",

  buildPrompt: function (
    formAnalysisOrPatch,
    testUrl,
    framework,
    options = {}
  ) {
    const baseUrl = testUrl || "http://localhost:3000";

    const hasFailures = Array.isArray(formAnalysisOrPatch?.failedScenarios);
    const scenarios = hasFailures
      ? formAnalysisOrPatch.failedScenarios
      : formAnalysisOrPatch.recommendedTestScenarios;

    const preservedTests = hasFailures
      ? formAnalysisOrPatch.passedCode || ""
      : "";

    return `Generate ${framework} test code.

Test URL: ${baseUrl}

${
  hasFailures
    ? `Preserve these working test cases:
${preservedTests}

Regenerate these failed scenarios:
${JSON.stringify(scenarios, null, 2)}`
    : `Form Analysis:
${JSON.stringify(formAnalysisOrPatch, null, 2)}`
}

Return executable test code:`;
  },
};

module.exports = TEST_CODE_GENERATOR;
