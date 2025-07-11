/**
 * UNIFIED PROMPT COLLECTION
 * All prompts for Qwen2.5-coder optimization centralized in one location
 * Consolidates QwenPrompts + ConfigHelper agents + Framework templates
 */

// =============================================================================
// CORE FORM & TEST ANALYSIS PROMPTS
// =============================================================================

const PROMPTS = {
  // Form Structure Analysis (Primary - used by ModelOrchestrator)
  FORM_STRUCTURE_ANALYZER: {
    system:
      "You are a form analysis expert. Analyze HTML forms and extract structured information about fields, validation rules, and user interactions.",

    buildPrompt: (htmlContent, description, acceptanceCriteria) => {
      return `Analyze this HTML form and extract its structure:

HTML Content:
${htmlContent}

Description: ${description}
Acceptance Criteria: ${acceptanceCriteria}

Return a JSON object with this structure:
{
  "formFields": [
    {
      "name": "field_name",
      "type": "input_type",
      "selector": "#field-id",
      "required": true/false,
      "validation": {},
      "errorSelector": "#field-error"
    }
  ],
  "validationLogic": {
    "clientSide": true/false,
    "rules": []
  },
  "submitButton": "#submit-selector",
  "formAction": "submit_url"
}`;
    },

    temperature: 0.2,
  },

  // Test Code Generation (Primary - used by ModelOrchestrator)
  TEST_CODE_GENERATOR: {
    system: `You are an expert Playwright test automation engineer. Generate production-ready TypeScript test code using Page Object Model pattern and comprehensive test coverage.

IMPORTANT: For data-driven tests, use a for...of loop to generate multiple test() calls. Do NOT use test.each. Playwright TypeScript does not support test.each.,

CRITICAL REQUIREMENTS:
1. Generate ONLY executable TypeScript code - NO explanations, comments, or markdown
2. Use EXACT TypeScript syntax with proper imports and types
3. Implement professional Page Object Model architecture
4. Create comprehensive test scenarios with data-driven approach
5. Include robust error handling and assertion patterns
6. Follow enterprise-grade testing standards

TYPESCRIPT STRUCTURE REQUIRED:
- Import statements: import { test, expect, Page, Locator } from '@playwright/test';
- Page Object Model class with typed properties and methods  
- Test data interfaces and constants
- Multiple test.describe blocks for organized test suites
- Individual test cases with comprehensive coverage
- Proper async/await patterns throughout


PAGE OBJECT MODEL REQUIREMENTS:
- TypeScript class with constructor accepting Page object
- Constructor parameter: constructor(page: Page)
- All locators as readonly properties: readonly fieldName: Locator;
- Locator initialization in constructor: this.fieldName = this.page.locator('#selector');
- Typed method signatures for all interactions
- Helper methods for form operations (fill, submit, validate)
- Error checking methods with proper return types
- Clean separation of concerns


EXACT TYPING PATTERNS REQUIRED:
- Page type: page: Page (not any)
- Locator type: readonly fieldName: Locator (not any or ElementHandle)
- Constructor: constructor(page: Page) - no import() statements
- Method signatures: async methodName(): Promise<returnType>
- Import: import { test, expect, Page, Locator } from '@playwright/test';


TEST COVERAGE REQUIREMENTS:
- Individual field validation (positive/negative cases)
- Cross-field validation scenarios
- Form submission behavior testing
- Error message verification with exact text matching
- Success flow validation
- Edge case handling (empty, boundary values, special characters)
- Data-driven test scenarios using test.each or similar patterns


MODERN PLAYWRIGHT PATTERNS:
- Use page.locator() exclusively for element selection
- Use expect().toBeVisible(), expect().toHaveText() for assertions
- Use page.fill() for input interactions
- Use page.click() for button interactions
- Implement proper wait strategies with expect() assertions
- Use test.beforeEach for consistent test setup


FORBIDDEN PATTERNS:
- waitForSelector() or other deprecated wait methods
- jQuery-style selectors without page.locator()
- Hardcoded delays or timeouts
- Non-TypeScript syntax (var, function declarations, etc.)
- Comments explaining code structure
- Any text outside TypeScript code blocks
- import('...') dynamic imports in type declarations
- any type for Page or Locator objects
- ElementHandle types (use Locator instead)


OUTPUT REQUIREMENTS:
1. Start with: import { test, expect, Page, Locator } from '@playwright/test';
2. Define interfaces for test data
3. Implement Page Object Model class with proper Page and Locator typing
4. Create test data constants
5. Write comprehensive test suite with multiple describe blocks
6. End with complete test scenarios
`,

    buildPrompt: (formAnalysis, testUrl, framework, options = {}) => {
      const businessContext = formAnalysis.businessContext || {};
      const description =
        businessContext.purpose || formAnalysis.description || "";
      const acceptanceCriteria =
        businessContext.criteria || formAnalysis.acceptanceCriteria || "";

      // Extract relevant fields from form analysis
      const relevantFields = formAnalysis.relevantFields || [];
      const formFields = formAnalysis.formFields || [];

      // Build field information for prompt
      const fieldInfo = formFields
        .filter(
          (field) =>
            relevantFields.includes(field.name) || relevantFields.length === 0
        )
        .map(
          (field) =>
            `${field.name}: ${field.type} (selector: ${field.selector}, required: ${field.required})`
        )
        .join("\n");

      return `Generate production-ready TypeScript Playwright test automation code for comprehensive form validation testing.

IMPORTANT: For data-driven tests, use a for...of loop to generate multiple test() calls. Do NOT use test.each. Playwright TypeScript does not support test.each.

BUSINESS CONTEXT:
Purpose: ${description}
Acceptance Criteria: ${acceptanceCriteria}

FORM FIELDS TO TEST:
${fieldInfo}

TEST TARGET URL: ${testUrl}

VALIDATION BEHAVIOR SPECIFICATION:
- Error messages display as red text below invalid fields with selector pattern: #fieldname-error
- Validation triggers on form submission and field blur events
- Multiple simultaneous validation errors are supported
- Global form error appears when validation fails: "Please fix the errors above before submitting"
- Form submission is prevented when validation errors exist
- Successful form submission occurs when all validations pass
- Client-side validation provides immediate feedback
- Server-side validation may provide additional error handling

REQUIRED TEST DELIVERABLES:

1. TYPESCRIPT INTERFACES:
   - FormData interface defining all form field types
   - ValidationError interface for error message structure
   - TestScenario interface for data-driven test cases

2. PAGE OBJECT MODEL CLASS:
   - TypeScript class with proper typing
   - All form field locators as readonly properties
   - Typed methods for form interactions (fill, clear, submit)
   - Validation checking methods with boolean return types
   - Error message retrieval methods
   - Form state checking methods

3. TEST DATA MANAGEMENT:
   - Valid form data constants with proper typing
   - Invalid data scenarios with expected error messages
   - Edge case test data (boundary values, special characters)
   - Data-driven test scenarios using arrays or test.each patterns

4. COMPREHENSIVE TEST SUITE:
   - Individual field validation tests (positive/negative)
   - Multi-field validation combination tests
   - Form submission behavior tests
   - Error message accuracy verification
   - Success flow validation
   - Cross-browser compatibility considerations

5. TEST ORGANIZATION:
   - Multiple test.describe blocks for logical grouping
   - test.beforeEach for consistent page setup
   - Clear, descriptive test names following AAA pattern
   - Proper test isolation and cleanup

TECHNICAL SPECIFICATIONS:
- Use TypeScript with strict typing
- Implement async/await patterns throughout
- Use page.locator() for all element interactions
- Use expect().toBeVisible(), expect().toHaveText() for assertions
- Include proper error handling with try/catch where appropriate
- Follow Page Object Model best practices for maintainability

EXPECTED OUTPUT FORMAT:
TypeScript code starting with imports, followed by interfaces, Page Object Model class, test data, and comprehensive test suite. No explanations or comments - only executable code.`;
    },

    temperature: 0.1,
  },

  // Incremental Test Code Generation (for amending existing tests)
  INCREMENTAL_TEST_GENERATOR: {
    system: `You are a test code generator for incremental updates. Generate ONLY new test cases to add to existing tests.

MODERN PLAYWRIGHT REQUIREMENTS:
- Use page.locator() instead of waitForSelector()
- Use expect() with proper Locator objects
- Use fill('') to clear inputs, not clear() method
- Use toBeVisible() and not.toBeVisible() for error messages

FORBIDDEN:
- Complete test suites or describe blocks
- Imports or require statements
- Explanations or descriptions
- Markdown blocks
- waitForSelector() - use page.locator() instead

REQUIRED FORMAT:
- Generate ONLY individual test() blocks
- Each test should be complete and standalone
- Start directly with: test('description', async ({ page }) => {
- End with the closing brace of the test function`,

    buildPrompt: (
      existingTestContent,
      newRequirements,
      formAnalysis,
      testUrl
    ) => {
      return `Add new test cases for these requirements using MODERN Playwright:

New Requirements: ${newRequirements}
Form Analysis: ${JSON.stringify(formAnalysis, null, 2)}
Test URL: ${testUrl}

Existing Test Content Preview:
${existingTestContent.substring(0, 800)}...

MODERN PLAYWRIGHT PATTERNS TO USE:
- const element = page.locator('#selector');
- await element.fill(value);
- await expect(element).toBeVisible();

Generate ONLY new test() blocks that:
1. Test the new requirements specifically
2. Don't duplicate existing test scenarios
3. Use page.locator() for element selection
4. Include proper error handling
5. Calculate dates/values correctly for business logic

Output only test() functions, no complete describe blocks.`;
    },

    temperature: 0.1,
  },

  // Test Quality Improvement (Primary - used by ModelOrchestrator)
  TEST_QUALITY_IMPROVER: {
    system:
      "You are a test quality expert. Improve existing test code to be more robust, maintainable, and comprehensive.",

    buildPrompt: (existingCode, formAnalysis, failedTests = []) => {
      return `Improve this test code:

Existing Code:
${existingCode}

Form Analysis:
${JSON.stringify(formAnalysis, null, 2)}

Failed Tests: ${failedTests.join(", ")}

Improvements needed:
1. Fix any test failures
2. Add missing test scenarios
3. Improve selectors and assertions
4. Add better error handling
5. Optimize test structure`;
    },

    temperature: 0.2,
  },

  // Code Verification (Primary - used by ModelOrchestrator)
  CODE_VERIFIER: {
    system:
      "You are a code quality verifier. Check test code for correctness, completeness, and best practices.",

    buildPrompt: (testCode, testUrl) => {
      return `Verify this test code quality:

Test Code:
${testCode}

Test URL: ${testUrl}

Return JSON assessment:
{
  "approved": true/false,
  "issues": ["list of issues"],
  "suggestions": ["improvement suggestions"],
  "confidence": 0.0-1.0
}`;
    },

    temperature: 0.1,
  },

  // =============================================================================
  // SPECIALIZED ANALYSIS PROMPTS (Legacy - kept for compatibility)
  // =============================================================================

  // Intelligent Test Strategy Generation
  INTELLIGENT_TEST_GENERATOR: {
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
      "steps": ["step1", "step2"],
      "expectedResults": ["result1", "result2"]
    }
  ]
}`,
    temperature: 0.2,
    category: "analysis",

    buildPrompt: function (formStructure, description, acceptanceCriteria) {
      return `Create intelligent test strategies for this form:

Form Structure:
${JSON.stringify(formStructure, null, 2)}

Description: ${description}
Acceptance Criteria: ${acceptanceCriteria}

Generate comprehensive test scenarios with exact selectors and expected messages.`;
    },
  },

  // Form Quality Validation
  FORM_QUALITY_AUDITOR: {
    name: "FORM_QUALITY_AUDITOR",
    role: "form quality validator",
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

      if (description) {
        prompt += `

Description: ${description}`;
      }

      if (acceptanceCriteria) {
        prompt += `

Acceptance Criteria: ${acceptanceCriteria}`;
      }

      prompt += `

Validate selectors, error messages, and test scenarios against the original form.
Return improved JSON with same structure but corrected/optimized values.`;

      return prompt;
    },
  },
};

// =============================================================================
// FRAMEWORK HELPERS (Consolidated from framework-templates.js)
// =============================================================================

/**
 * Calculate date for a specific age
 */
function getDateForAge(ageYears, monthsOffset = 0, daysOffset = 0) {
  const now = new Date();
  const targetDate = new Date(
    now.getFullYear() - ageYears,
    now.getMonth() + monthsOffset,
    now.getDate() + daysOffset
  );
  return targetDate.toISOString().split("T")[0];
}

const FRAMEWORK_TEMPLATES = {
  playwright: {
    imports: `const { test, expect } = require('@playwright/test');`,

    helpers: `
// Helper function to calculate dates based on current year
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

async function fillFieldAndWaitForValidation(page, fieldSelector, value, validationDelay = 100) {
  await page.locator(fieldSelector).waitFor({ state: 'visible' });
  await page.locator(fieldSelector).clear();
  await page.locator(fieldSelector).fill(value);
  await page.waitForTimeout(validationDelay);
}

async function submitFormAndWait(page, submitSelector = 'button[type="submit"]', waitTime = 300) {
  await page.locator(submitSelector).click();
  await page.waitForTimeout(waitTime);
}`,

    testStructure: `
test.describe('Form Tests', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('{TEST_URL}', { timeout: 30000 });
  });

  test.afterEach(async () => {
    await page.close();
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
}`,

    testStructure: `
describe('Form Tests', () => {
  beforeEach(() => {
    cy.visit('{TEST_URL}');
  });

  // Test cases will be generated here
});`,
  },
};

// =============================================================================
// CONFIGURATION & HELPER FUNCTIONS
// =============================================================================

const DEFAULT_OPTIONS = {
  enableSelfReflection: true,
  enableProgressUpdates: true,
  outputFormat: "playwright",
  framework: "playwright",
};

/**
 * ConfigHelper - Backwards compatibility for existing code
 */
class ConfigHelper {
  static getAgent(agentName) {
    return PROMPTS[agentName];
  }

  static hasAgent(agentName) {
    return !!PROMPTS[agentName];
  }

  static getSystemPrompt(agentName) {
    const agent = PROMPTS[agentName];
    return agent?.systemPrompt || agent?.system;
  }

  static getTemperature(agentName) {
    const agent = PROMPTS[agentName];
    return agent?.temperature || 0.1;
  }

  static buildPrompt(agentName, ...args) {
    const agent = PROMPTS[agentName];
    if (agent && agent.buildPrompt) {
      return agent.buildPrompt(...args);
    }
    throw new Error(
      `Agent ${agentName} not found or doesn't have buildPrompt function`
    );
  }

  static getFrameworkTemplate(framework) {
    return FRAMEWORK_TEMPLATES[framework] || FRAMEWORK_TEMPLATES.playwright;
  }

  static getAllAgentNames() {
    return Object.keys(PROMPTS);
  }

  static debugAgentConfig() {
    return Object.keys(PROMPTS).map((name) => ({
      name,
      hasSystemPrompt: !!this.getSystemPrompt(name),
      hasBuildPrompt: !!PROMPTS[name].buildPrompt,
      temperature: this.getTemperature(name),
    }));
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Main prompts object (for new code)
  PROMPTS,

  // Backwards compatibility exports
  QwenPrompts: PROMPTS,
  FRAMEWORK_TEMPLATES,
  ConfigHelper,
  DEFAULT_OPTIONS,

  // Individual prompt access (for legacy compatibility)
  FORM_STRUCTURE_ANALYZER: PROMPTS.FORM_STRUCTURE_ANALYZER,
  TEST_CODE_GENERATOR: PROMPTS.TEST_CODE_GENERATOR,
  TEST_QUALITY_IMPROVER: PROMPTS.TEST_QUALITY_IMPROVER,
  CODE_VERIFIER: PROMPTS.CODE_VERIFIER,
  INTELLIGENT_TEST_GENERATOR: PROMPTS.INTELLIGENT_TEST_GENERATOR,
  FORM_QUALITY_AUDITOR: PROMPTS.FORM_QUALITY_AUDITOR,

  // Helper functions
  getDateForAge,
};
