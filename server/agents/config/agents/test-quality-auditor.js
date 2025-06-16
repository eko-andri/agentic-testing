// Clean Test Quality Auditor Agent Configuration
const TEST_QUALITY_AUDITOR = {
  name: "TEST_QUALITY_AUDITOR",
  role: "test quality validator",
  task: "Validate and optimize test scenarios against form behavior",
  systemPrompt: `Validate test scenarios against original form structure.

Ensure:
- Error messages match exact JavaScript text
- Selectors target correct form elements 
- Test scenarios cover acceptance criteria
- Business logic matches form implementation
- Test data will trigger actual form validation

Return optimized JSON with same structure as input.
Use exact error messages and selectors from original form.
Return only valid JSON without comments or markdown.`,
  temperature: 0.1,
  category: "validation",
  buildPrompt: function (
    initialResult,
    originalFormStructure = null,
    description = null,
    acceptanceCriteria = null
  ) {
    let prompt = `Validate and optimize this test analysis:

Initial Analysis:
${JSON.stringify(initialResult, null, 2)}`;

    if (originalFormStructure) {
      prompt += `

Original Form Structure:
${JSON.stringify(originalFormStructure, null, 2)}`;
    }

    if (description || acceptanceCriteria) {
      prompt += `

Requirements:
Description: ${description || "None"}
Acceptance Criteria: ${acceptanceCriteria || "None"}`;
    }

    prompt += `

Validate:
1. Error messages match form JavaScript
2. Selectors target correct elements
3. Test scenarios cover requirements
4. Business logic matches form behavior

Return optimized JSON only:`;

    return prompt;
  },
};

module.exports = TEST_QUALITY_AUDITOR;
