// FIXED Intelligent Test Generator - Bridges Missing Links
const INTELLIGENT_TEST_GENERATOR = {
  name: "INTELLIGENT_TEST_GENERATOR",
  role: "test scenario generator",
  task: "Create test strategies with complete selector and message mapping",
  systemPrompt: `Generate test scenarios with COMPLETE selector and message information for test generation.

CRITICAL: Include exact selectors and messages in test scenarios so TEST_CODE_GENERATOR has everything needed.

Return JSON:
{
  "fields": {
    "field_name": {
      "type": "field_type",
      "selectors": {
        "field": "exact_field_selector",
        "error": "exact_error_selector", 
        "success": "exact_success_selector"
      },
      "messages": {
        "errorType": "exact_error_message"
      },
      "testingStrategies": [...]
    }
  },
  "recommendedTestScenarios": [
    {
      "description": "scenario_description",
      "type": "happy_path|validation|edge_case",
      "steps": [
        {
          "action": "fill|click|verify|submit",
          "fieldName": "field_name",
          "fieldSelector": "exact_selector_from_analysis",
          "value": "test_value",
          "expected": "expected_result",
          "errorSelector": "exact_error_selector",
          "expectedText": "exact_message_text",
          "shouldBeVisible": boolean
        }
      ]
    }
  ],
  "selectorMapping": {
    "field_name": {
      "field": "exact_field_selector",
      "error": "exact_error_selector"
    }
  },
  "messageMapping": {
    "field_name": {
      "errorType": "exact_error_message"
    }
  }
}

Include complete selector and message mapping from form analysis.
Each test step must have exact selectors and expected messages.
Return clean JSON only.`,
  temperature: 0.3,
  category: "analysis",
  buildPrompt: function (formStructure, description, acceptanceCriteria) {
    const currentDate = new Date().toISOString().split("T")[0];
    const currentYear = new Date().getFullYear();

    return `Generate test scenarios with COMPLETE selector mapping from this form analysis:

Current Date: ${currentDate}
Current Year: ${currentYear}

Form Structure:
${JSON.stringify(formStructure, null, 2)}

Business Context:
Description: ${description || "None"}
Acceptance Criteria: ${acceptanceCriteria || "None"}

CRITICAL REQUIREMENTS:
1. Extract EXACT selectors from formStructure.formFields[].selector
2. Extract EXACT error selectors from formStructure.formFields[].validationLogic.errorDisplayElement
3. Extract EXACT error messages from formStructure.clientSideValidation.errorMessages
4. Extract EXACT success messages from formStructure.clientSideValidation.successMessages
5. Include complete selector mapping in recommendedTestScenarios steps
6. Each test step must specify exact selectors and expected messages

For each test scenario step, include:
- fieldSelector: exact selector from analysis
- errorSelector: exact error element selector  
- expectedText: exact message text from analysis
- shouldBeVisible: boolean for element visibility

Generate complete test scenarios with all selector and message mapping:`;
  },
};

module.exports = INTELLIGENT_TEST_GENERATOR;
