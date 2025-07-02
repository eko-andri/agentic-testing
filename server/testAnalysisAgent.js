const DatabaseAgent = require("./database-dummy"); // Use dummy database agent
const { ContextFilterAgent } = require("./contextFilterAgent");
const { PROMPTS } = require("./prompts");
const { callLLM } = require("./utils");
const path = require("path");
const fs = require("fs");

class TestAnalysisAgent {
  constructor() {
    this.dbAgent = new DatabaseAgent(); // Use dummy database agent
    this.contextFilterAgent = new ContextFilterAgent();
    this.prompts = PROMPTS;
    this.testDirectory = path.join(__dirname, "tests");
    this.coreTestDirectory = path.join(this.testDirectory, "core");
    this.businessTestDirectory = path.join(this.testDirectory, "business");
  }

  /**
   * Initialize the agent
   */
  async initialize() {
    await this.dbAgent.initialize();

    // Ensure test directories exist
    [
      this.testDirectory,
      this.coreTestDirectory,
      this.businessTestDirectory,
    ].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Analyze new context and determine what tests need to be created/modified
   */
  async analyzeContext(description, acceptanceCriteria, formFields = []) {
    console.log("🔍 Analyzing context:", description);

    // Step 1: Filter relevant fields using LLM
    const relevantFields = await this.contextFilterAgent.filterRelevantFields(
      formFields,
      description,
      acceptanceCriteria
    );

    console.log(
      "✅ Relevant fields identified:",
      relevantFields.map((f) => f.name)
    );

    // Step 2: Check for similar contexts in database
    const similarContexts = await this.dbAgent.getSimilarContexts(
      description,
      3
    );
    console.log(`📊 Found ${similarContexts.length} similar contexts`);

    // Step 3: Store context in database
    const contextResult = await this.dbAgent.upsertTestContext({
      description,
      acceptanceCriteria,
      relevantFields: relevantFields.map((f) => f.name),
    });

    // Step 4: Analyze what test files need to be created/modified
    const testPlan = await this.createTestPlan(
      relevantFields,
      contextResult.id,
      similarContexts
    );

    return {
      contextId: contextResult.id,
      relevantFields,
      similarContexts,
      testPlan,
    };
  }

  /**
   * Create a test plan based on relevant fields and context
   */
  async createTestPlan(relevantFields, contextId, similarContexts) {
    const testPlan = {
      coreTests: [],
      businessTests: [],
      existingTests: [],
      modifications: [],
    };

    // Group fields by type
    const fieldsByType = this.groupFieldsByType(relevantFields);

    // Check existing test files
    const existingTests = await this.dbAgent.getTestFiles();
    const existingTestMap = new Map(
      existingTests.map((test) => [test.test_type, test])
    );

    // Plan core tests (generic validation logic)
    for (const [fieldType, fields] of Object.entries(fieldsByType)) {
      const coreTestFile = `${fieldType}-core.spec.ts`;
      const existingCore = existingTests.find(
        (test) => test.test_type === "core" && test.filename === coreTestFile
      );

      if (!existingCore) {
        testPlan.coreTests.push({
          filename: coreTestFile,
          type: "core",
          fields,
          action: "create",
        });
      } else {
        testPlan.existingTests.push({
          ...existingCore,
          action: "check",
        });
      }
    }

    // Plan business tests (context-specific logic)
    const businessTestFile = `${this.generateBusinessTestName(
      contextId
    )}.spec.js`;
    const existingBusiness = existingTests.find(
      (test) => test.filename === businessTestFile
    );

    if (!existingBusiness) {
      testPlan.businessTests.push({
        filename: businessTestFile,
        type: "business",
        contextId,
        fields: relevantFields,
        action: "create",
      });
    } else {
      // Check if business test needs modification
      const needsModification = await this.checkBusinessTestModification(
        existingBusiness,
        relevantFields,
        contextId
      );

      if (needsModification) {
        testPlan.modifications.push({
          ...existingBusiness,
          action: "modify",
          reason: "context_changed",
        });
      }
    }

    // Check for test consolidation opportunities
    if (similarContexts.length > 0) {
      const consolidationOpportunities =
        await this.checkConsolidationOpportunities(
          similarContexts,
          relevantFields
        );
      testPlan.consolidationOpportunities = consolidationOpportunities;
    }

    return testPlan;
  }

  /**
   * Group fields by their type for core test organization
   */
  groupFieldsByType(fields) {
    const grouped = {};

    fields.forEach((field) => {
      let type = "general";

      if (field.type === "date" || field.name.toLowerCase().includes("date")) {
        type = "date";
      } else if (
        field.type === "email" ||
        field.name.toLowerCase().includes("email")
      ) {
        type = "email";
      } else if (
        field.type === "tel" ||
        field.name.toLowerCase().includes("phone") ||
        field.name.toLowerCase().includes("mobile")
      ) {
        type = "phone";
      } else if (field.type === "text" || field.type === "textarea") {
        type = "text";
      } else if (field.type === "number") {
        type = "number";
      }

      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(field);
    });

    return grouped;
  }

  /**
   * Generate business test name based on context
   */
  generateBusinessTestName(contextId) {
    const timestamp = Date.now();
    return `business_context_${contextId}_${timestamp}`;
  }

  /**
   * Check if business test needs modification
   */
  async checkBusinessTestModification(existingTest, relevantFields, contextId) {
    // Get test file with its contexts
    const testWithContexts = await this.dbAgent.getTestFileWithContexts(
      existingTest.filename
    );

    if (!testWithContexts || !testWithContexts.contexts) {
      return true; // No context info, needs update
    }

    // Check if current context is already linked
    const hasCurrentContext = testWithContexts.contexts.some(
      (ctx) => ctx.description && ctx.relevant_fields.length > 0
    );

    if (!hasCurrentContext) {
      return true; // New context needs to be added
    }

    // Check if relevant fields changed significantly
    const existingFields = new Set(
      testWithContexts.contexts.flatMap((ctx) => ctx.relevant_fields)
    );
    const newFields = new Set(relevantFields.map((f) => f.name));

    const fieldDifference = new Set(
      [...newFields].filter((f) => !existingFields.has(f))
    );

    return fieldDifference.size > 0; // Needs modification if new fields detected
  }

  /**
   * Check for test consolidation opportunities
   */
  async checkConsolidationOpportunities(similarContexts, relevantFields) {
    const opportunities = [];

    for (const context of similarContexts) {
      const contextFields = new Set(context.relevant_fields);
      const currentFields = new Set(relevantFields.map((f) => f.name));

      // Calculate field overlap
      const overlap = new Set(
        [...contextFields].filter((f) => currentFields.has(f))
      );
      const overlapRatio =
        overlap.size / Math.max(contextFields.size, currentFields.size);

      if (overlapRatio > 0.7) {
        // High overlap
        opportunities.push({
          contextId: context.id,
          description: context.description,
          overlapRatio,
          commonFields: [...overlap],
          suggestion: "Consider consolidating similar test scenarios",
        });
      }
    }

    return opportunities;
  }

  /**
   * Execute test plan - create/modify test files
   */
  async executeTestPlan(testPlan, description, acceptanceCriteria) {
    const results = {
      created: [],
      modified: [],
      errors: [],
    };

    console.log("🚀 Executing test plan...");

    try {
      // Create core tests
      for (const coreTest of testPlan.coreTests) {
        try {
          const testContent = await this.generateCoreTestContent(coreTest);
          const filePath = path.join(this.coreTestDirectory, coreTest.filename);

          fs.writeFileSync(filePath, testContent);

          // Record in database
          const fileResult = await this.dbAgent.upsertTestFile({
            filename: coreTest.filename,
            filepath: filePath,
            testType: "core",
            fileContent: testContent,
            metadata: { fields: coreTest.fields },
          });

          results.created.push({
            filename: coreTest.filename,
            type: "core",
            fileId: fileResult.id,
          });

          console.log("✅ Created core test:", coreTest.filename);
        } catch (error) {
          results.errors.push({
            filename: coreTest.filename,
            error: error.message,
          });
        }
      }

      // Create business tests
      for (const businessTest of testPlan.businessTests) {
        try {
          const testContent = await this.generateBusinessTestContent(
            businessTest,
            description,
            acceptanceCriteria
          );
          const filePath = path.join(
            this.businessTestDirectory,
            businessTest.filename
          );

          fs.writeFileSync(filePath, testContent);

          // Record in database
          const fileResult = await this.dbAgent.upsertTestFile({
            filename: businessTest.filename,
            filepath: filePath,
            testType: "business",
            fileContent: testContent,
            metadata: {
              contextId: businessTest.contextId,
              fields: businessTest.fields,
            },
          });

          // Link with context
          await this.dbAgent.linkTestContext(
            fileResult.id,
            businessTest.contextId
          );

          results.created.push({
            filename: businessTest.filename,
            type: "business",
            fileId: fileResult.id,
          });

          console.log("✅ Created business test:", businessTest.filename);
        } catch (error) {
          results.errors.push({
            filename: businessTest.filename,
            error: error.message,
          });
        }
      }

      // Handle modifications
      for (const modification of testPlan.modifications) {
        try {
          const updatedContent = await this.modifyBusinessTest(
            modification,
            description,
            acceptanceCriteria
          );

          fs.writeFileSync(modification.filepath, updatedContent);

          // Update in database
          await this.dbAgent.upsertTestFile({
            filename: modification.filename,
            filepath: modification.filepath,
            testType: modification.test_type,
            fileContent: updatedContent,
            metadata: JSON.parse(modification.metadata || "{}"),
          });

          results.modified.push({
            filename: modification.filename,
            reason: modification.reason,
          });

          console.log("✅ Modified test:", modification.filename);
        } catch (error) {
          results.errors.push({
            filename: modification.filename,
            error: error.message,
          });
        }
      }
    } catch (error) {
      console.error("❌ Error executing test plan:", error);
      results.errors.push({
        general: error.message,
      });
    }

    return results;
  }

  /**
   * Generate core test content for field validation
   */
  async generateCoreTestContent(coreTest) {
    const { fields, filename } = coreTest;
    const testType = filename.split("-")[0];

    // Prepare form analysis for the prompt
    const formAnalysis = {
      formFields: fields.map((field) => ({
        name: field.name,
        type: field.type,
        selector: field.id ? `#${field.id}` : `input[name="${field.name}"]`,
        required: field.required || false,
        errorSelector: `#${field.name}-error`,
      })),
      relevantFields: fields.map((field) => field.name),
      description: `Core validation test for ${testType} field${
        fields.length > 1 ? "s" : ""
      }`,
      acceptanceCriteria: `Validate ${testType} field${
        fields.length > 1 ? "s" : ""
      } for required validation, format validation, and proper error handling`,
      businessContext: {
        purpose: `Core ${testType} field validation`,
        criteria: `Ensure ${testType} field${
          fields.length > 1 ? "s" : ""
        } validate correctly for required values, proper format, and display appropriate error messages`,
      },
    };

    const testUrl = "http://localhost:5500/policy-form.html";

    try {
      // Use the TEST_CODE_GENERATOR prompt to generate TypeScript test
      const prompt = this.prompts.TEST_CODE_GENERATOR.buildPrompt(
        formAnalysis,
        testUrl,
        "playwright"
      );

      console.log(
        `[Core Test Generation] Generating ${testType} core test using LLM...`
      );
      console.log(`[Core Test Generation] Prompt length: ${prompt.length}`);

      if (!prompt || prompt.trim().length === 0) {
        throw new Error("Generated prompt is empty");
      }

      const response = await this.callLLM({
        prompt: prompt,
        system: this.prompts.TEST_CODE_GENERATOR.system,
        temperature: this.prompts.TEST_CODE_GENERATOR.temperature,
      });

      // Extract only the code content, remove any narrative/thoughts before the import statement
      let testContent = response.trim();

      // Remove any markdown code blocks if present
      testContent = testContent
        .replace(/```typescript\n?/g, "")
        .replace(/```\n?/g, "");

      // Remove any narrative/thoughts before the import statement
      const importLine =
        "import { test, expect, Page, Locator } from '@playwright/test';";
      const lines = testContent.split("\n");
      const startIdx = lines.findIndex((line) => line.includes(importLine));
      if (startIdx >= 0) {
        testContent = lines.slice(startIdx).join("\n");
      }

      // Ensure we have proper content
      if (
        !testContent.includes("import") &&
        !testContent.includes("test.describe")
      ) {
        throw new Error(
          "Generated content does not appear to be valid test code"
        );
      }

      console.log(
        `[Core Test Generation] Successfully generated ${testType} core test`
      );
      return testContent;
    } catch (error) {
      console.error(
        `[Core Test Generation] Error generating ${testType} core test:`,
        error.message
      );

      // Fallback to basic template if LLM fails
      console.log(
        `[Core Test Generation] Using fallback template for ${testType}`
      );
      return this.generateBasicCoreTestTemplate(coreTest);
    }
  }

  /**
   * Fallback method for basic core test template
   */
  generateBasicCoreTestTemplate(coreTest) {
    const { fields, filename } = coreTest;
    const testType = filename.split("-")[0];

    let testContent = `import { test, expect, Page, Locator } from '@playwright/test';

interface FormData {
  ${fields.map((field) => `${field.name}: string;`).join("\n  ")}
}

class PolicyFormPage {
  readonly page: Page;
  ${fields.map((field) => `readonly ${field.name}Field: Locator;`).join("\n  ")}
  ${fields.map((field) => `readonly ${field.name}Error: Locator;`).join("\n  ")}

  constructor(page: Page) {
    this.page = page;
    ${fields
      .map((field) => {
        const selector = field.id
          ? `#${field.id}`
          : `input[name="${field.name}"]`;
        return `this.${field.name}Field = this.page.locator('${selector}');`;
      })
      .join("\n    ")}
    ${fields
      .map(
        (field) =>
          `this.${field.name}Error = this.page.locator('#${field.name}-error');`
      )
      .join("\n    ")}
  }

  async fill${testType.charAt(0).toUpperCase() + testType.slice(1)}(${fields
      .map((field) => `${field.name}: string`)
      .join(", ")}): Promise<void> {
    ${fields
      .map((field) => `await this.${field.name}Field.fill(${field.name});`)
      .join("\n    ")}
  }

  async submitForm(): Promise<void> {
    await this.page.click('button[type="submit"]');
  }

  async get${
    testType.charAt(0).toUpperCase() + testType.slice(1)
  }Error(): Promise<string | null> {
    try {
      await this.${fields[0].name}Error.waitFor({ state: 'visible' });
      return this.${fields[0].name}Error.textContent();
    } catch {
      return null;
    }
  }

  async isFormValid(): Promise<boolean> {
    const errorText = await this.get${
      testType.charAt(0).toUpperCase() + testType.slice(1)
    }Error();
    return !errorText;
  }
}

test.describe('${testType.toUpperCase()} Field Core Validation', () => {
  let page: Page;
  let policyFormPage: PolicyFormPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://localhost:5500/policy-form.html');
    policyFormPage = new PolicyFormPage(page);
  });

  test.afterEach(async () => {
    await page.close();
  });

`;

    for (const field of fields) {
      testContent += this.generateCoreTestCase(field, testType);
    }

    testContent += `});
`;

    return testContent;
  }

  /**
   * Generate core test case for a field
   */
  generateCoreTestCase(field, testType) {
    let testCase = `  test('should validate ${
      field.name
    } field as required', async () => {
    await policyFormPage.fill${
      testType.charAt(0).toUpperCase() + testType.slice(1)
    }('');
    await policyFormPage.submitForm();

    const errorText = await policyFormPage.get${
      testType.charAt(0).toUpperCase() + testType.slice(1)
    }Error();
    expect(errorText).toBe('This field is required');
  });

`;

    if (testType === "date") {
      testCase += `  test('should validate ${
        field.name
      } field with proper format', async () => {
    await policyFormPage.fill${
      testType.charAt(0).toUpperCase() + testType.slice(1)
    }('invalid-date');
    await policyFormPage.submitForm();

    const errorText = await policyFormPage.get${
      testType.charAt(0).toUpperCase() + testType.slice(1)
    }Error();
    expect(errorText).toBe('Please enter a valid date');
  });

  test('should allow valid ${field.name} field submission', async () => {
    await policyFormPage.fill${
      testType.charAt(0).toUpperCase() + testType.slice(1)
    }('2000-01-01');
    await policyFormPage.submitForm();

    expect(await policyFormPage.isFormValid()).toBe(true);
  });

`;
    } else if (testType === "email") {
      testCase += `  test('should validate ${
        field.name
      } field with proper format', async () => {
    await policyFormPage.fill${
      testType.charAt(0).toUpperCase() + testType.slice(1)
    }('invalid-email');
    await policyFormPage.submitForm();

    const errorText = await policyFormPage.get${
      testType.charAt(0).toUpperCase() + testType.slice(1)
    }Error();
    expect(errorText).toBe('Please enter a valid email address');
  });

  test('should allow valid ${field.name} field submission', async () => {
    await policyFormPage.fill${
      testType.charAt(0).toUpperCase() + testType.slice(1)
    }('test@example.com');
    await policyFormPage.submitForm();

    expect(await policyFormPage.isFormValid()).toBe(true);
  });

`;
    } else if (testType === "phone") {
      testCase += `  test('should validate ${
        field.name
      } field with proper format', async () => {
    await policyFormPage.fill${
      testType.charAt(0).toUpperCase() + testType.slice(1)
    }('123456789');
    await policyFormPage.submitForm();

    const errorText = await policyFormPage.get${
      testType.charAt(0).toUpperCase() + testType.slice(1)
    }Error();
    expect(errorText).toBe('Invalid phone number');
  });

  test('should allow valid ${field.name} field submission', async () => {
    await policyFormPage.fill${
      testType.charAt(0).toUpperCase() + testType.slice(1)
    }('1234567890');
    await policyFormPage.submitForm();

    expect(await policyFormPage.isFormValid()).toBe(true);
  });

`;
    }

    return testCase;
  }

  /**
   * Generate business test content based on context
   */
  // ...existing code...
  async generateBusinessTestContent(
    businessTest,
    description,
    acceptanceCriteria
  ) {
    const { fields, filename, contextId } = businessTest;

    // Header komentar
    let header =
      `// Business logic tests for context: ${description}\n` +
      `// Auto-generated by TestAnalysisAgent\n` +
      `// Context ID: ${contextId}\n` +
      `// Acceptance Criteria: ${acceptanceCriteria.replace(
        /\n/g,
        "\n// "
      )}\n\n`;

    // Generate test code via LLM or template
    let testCode = `const { test, expect } = require('@playwright/test');\n\n`;
    testCode += `test.describe('Business Logic - ${description}', () => {\n`;
    testCode += `    test.beforeEach(async ({ page }) => {\n`;
    testCode += `        await page.goto('http://localhost:5500/policy-form.html');\n`;
    testCode += `    });\n\n`;
    for (const field of fields) {
      testCode += this.generateBusinessTestCase(
        field,
        description,
        acceptanceCriteria
      );
    }
    testCode += this.generateIntegrationTestCase(fields, description);
    testCode += `});\n`;

    // Filter: jika ada narasi dari LLM, ambil hanya dari baris pertama yang mengandung 'const { test, expect' dst
    const importLine = "const { test, expect } = require('@playwright/test');";
    const lines = testCode.split("\n");
    const startIdx = lines.findIndex((line) => line.includes(importLine));
    if (startIdx >= 0) {
      testCode = lines.slice(startIdx).join("\n");
    }

    return header + testCode;
  }

  /**
   * Generate business test case for a field
   */
  generateBusinessTestCase(field, description, acceptanceCriteria) {
    const fieldSelector = field.id
      ? `#${field.id}`
      : `input[name="${field.name}"]`;

    let testCase = `    test('${field.name} - business logic validation', async ({ page }) => {
        const field = page.locator('${fieldSelector}');
        
`;

    if (field.name.toLowerCase().includes("date")) {
      testCase += `        // Business rule: ${description}
        // Test future date restriction (if applicable)
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        await field.fill(futureDate.toISOString().split('T')[0]);
        
        // Test past date restriction (if applicable)
        const pastDate = new Date();
        pastDate.setFullYear(pastDate.getFullYear() - 100);
        await field.fill(pastDate.toISOString().split('T')[0]);
        
`;
    }

    if (field.name.toLowerCase().includes("email")) {
      testCase += `        // Business rule: Email domain validation
        await field.fill('user@company.com');
        await expect(page.locator('.error-message')).toHaveCount(0);
        
`;
    }

    testCase += `    });

`;

    return testCase;
  }

  /**
   * Generate integration test case
   */
  generateIntegrationTestCase(fields, description) {
    return `    test('integration - complete form submission', async ({ page }) => {
        // Fill all required fields with valid data
${fields
  .map((field) => {
    const selector = field.id ? `#${field.id}` : `input[name="${field.name}"]`;
    let value = "test-value";

    if (field.type === "date") value = "2024-01-15";
    else if (field.type === "email") value = "test@example.com";
    else if (field.type === "tel") value = "+1234567890";
    else if (field.name.toLowerCase().includes("name")) value = "John Doe";

    return `        await page.fill('${selector}', '${value}');`;
  })
  .join("\n")}
        
        // Submit form
        await page.click('button[type="submit"]');
        
        // Verify submission success
        await expect(page.locator('.success-message')).toBeVisible();
    });

`;
  }

  /**
   * Modify existing business test
   */
  async modifyBusinessTest(modification, description, acceptanceCriteria) {
    const existingContent = fs.readFileSync(modification.filepath, "utf8");

    // Simple modification - add new test case
    const newTestCase = `
    test('${description} - additional validation', async ({ page }) => {
        // New business rule validation
        await page.goto('http://localhost:5500/policy-form.html');
        
        // Add specific validation logic based on acceptance criteria
        // ${acceptanceCriteria}
    });
`;

    // Insert before the closing brace
    const modifiedContent = existingContent.replace(
      /\}\);$/,
      newTestCase + "});"
    );

    return modifiedContent;
  }

  /**
   * Get analysis summary
   */
  async getAnalysisSummary() {
    const stats = await this.dbAgent.getStats();
    const recentExecutions = await this.dbAgent.getExecutionHistory(null, 10);

    return {
      stats,
      recentExecutions,
      recommendations: await this.generateRecommendations(stats),
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  async generateRecommendations(stats) {
    const recommendations = [];

    if (stats.failed_executions > stats.passed_executions * 0.2) {
      recommendations.push({
        type: "quality",
        message:
          "High failure rate detected. Consider reviewing test stability.",
      });
    }

    if (stats.avg_duration_ms > 5000) {
      recommendations.push({
        type: "performance",
        message:
          "Average test duration is high. Consider optimizing test execution.",
      });
    }

    if (stats.total_contexts > stats.active_tests * 2) {
      recommendations.push({
        type: "coverage",
        message:
          "Many contexts with few tests. Consider consolidating similar scenarios.",
      });
    }

    return recommendations;
  }

  /**
   * Close resources
   */
  async close() {
    await this.dbAgent.close();
  }

  /**
   * Call LLM with the given options
   */
  async callLLM(options) {
    return await callLLM(options);
  }
}

module.exports = TestAnalysisAgent;
