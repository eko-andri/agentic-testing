const callOllamaLLM = require("../utils/llmOllama");
const { ConfigHelper, DEFAULT_OPTIONS } = require("./config/prompts");

class TestGenerator {
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.framework = options.framework || "playwright";
    this.timeout = options.timeout || 5000;
    this.baseUrl = options.baseUrl || "http://localhost:3000";
    this.enableAccessibility = options.enableAccessibility || false;

    // Progress callback - will be injected by orchestrator
    this.progressCallback = options.progressCallback || (() => {});
  }

  async generateTests(formAnalysis, testUrl, options = {}) {
    const {
      framework = this.framework,
      includeSetup = true,
      includeTeardown = true,
      generateDataTestIds = false,
    } = options;

    try {
      this.progressCallback(
        "🧪 Test Generator\nInitializing test generation...",
        {
          status: `Preparing to generate ${framework} tests for ${
            Object.keys(formAnalysis.fields || {}).length
          } form fields`,
        }
      );

      // Validate input from form analyzer
      this._validateFormAnalysis(formAnalysis);

      // Generate framework-specific test code
      const testCode = await this._generateFrameworkSpecificCode(
        formAnalysis,
        testUrl,
        framework,
        { includeSetup, includeTeardown, generateDataTestIds }
      );

      // Post-process and validate generated code
      const optimizedCode = this._postProcessCode(testCode, framework);

      // Validate generated code
      const validationReport = this._validateGeneratedCode(
        optimizedCode,
        framework
      );

      this.progressCallback("✅ Test Generator\nTest generation completed", {
        code: optimizedCode,
        preview: `Generated ${
          (formAnalysis.recommendedTestScenarios || []).length
        } test scenarios`,
      });

      return {
        code: optimizedCode,
        framework,
        metadata: this._generateTestMetadata(formAnalysis),
        validationReport,
      };
    } catch (error) {
      this.progressCallback("❌ Test Generator\nTest generation failed", {
        error: error.message,
      });
      console.error("Test generation failed:", error);
      throw new Error(`Test generation failed: ${error.message}`);
    }
  }

  _validateFormAnalysis(formAnalysis) {
    if (!formAnalysis || typeof formAnalysis !== "object") {
      throw new Error("Invalid form analysis: must be an object");
    }

    if (!formAnalysis.fields || Object.keys(formAnalysis.fields).length === 0) {
      throw new Error("Invalid form analysis: no fields found");
    }

    // Validate that form analysis has the expected structure
    const requiredProperties = ["fields", "recommendedTestScenarios"];
    const missingProperties = requiredProperties.filter(
      (prop) => !formAnalysis[prop]
    );

    if (missingProperties.length > 0) {
      console.warn(
        `Form analysis missing properties: ${missingProperties.join(", ")}`
      );
    }
  }

  async _generateFrameworkSpecificCode(
    formAnalysis,
    testUrl,
    framework,
    options
  ) {
    this.progressCallback(
      `🧪 Test Generator\nGenerating ${framework} test code...`,
      {
        status: `Analyzing ${
          Object.keys(formAnalysis.fields || {}).length
        } form fields for test generation...`,
      }
    );

    const prompt = ConfigHelper.buildPrompt(
      "TEST_CODE_GENERATOR",
      formAnalysis,
      testUrl,
      framework,
      options
    );

    try {
      const code = await callOllamaLLM({
        prompt,
        system: ConfigHelper.getSystemPrompt("TEST_CODE_GENERATOR"),
        temperature: ConfigHelper.getTemperature("TEST_CODE_GENERATOR"),
      });

      this.progressCallback(
        `✅ Test Generator\n${framework} test code generated successfully`,
        {
          preview: `Generated ${
            (formAnalysis.recommendedTestScenarios || []).length
          } test scenarios`,
        }
      );

      return code;
    } catch (error) {
      this.progressCallback(
        `❌ Test Generator\nError generating ${framework} test code`,
        {
          error: error.message,
        }
      );
      throw new Error(
        `Failed to generate ${framework} test code: ${error.message}`
      );
    }
  }

  _postProcessCode(rawCode, framework) {
    this.progressCallback(
      "🧪 Test Generator\nPost-processing generated code..."
    );

    // Clean up the generated code
    let cleanedCode = rawCode
      .replace(/```[a-zA-Z]*\n/g, "") // Remove markdown code blocks
      .replace(/```/g, "") // Remove remaining backticks
      .replace(/\n{3,}/g, "\n\n") // Normalize multiple newlines
      .replace(/\r/g, "") // Remove carriage returns
      .trim();

    // Framework-specific post-processing
    switch (framework) {
      case "playwright":
        cleanedCode = this._postProcessPlaywright(cleanedCode);
        break;
      case "cypress":
        cleanedCode = this._postProcessCypress(cleanedCode);
        break;
      case "selenium":
        cleanedCode = this._postProcessSelenium(cleanedCode);
        break;
    }

    return cleanedCode;
  }

  _postProcessPlaywright(code) {
    // Ensure proper Playwright imports
    if (
      !code.includes("const { test, expect } = require('@playwright/test')") &&
      !code.includes('const { test, expect } = require("@playwright/test")')
    ) {
      code = "const { test, expect } = require('@playwright/test');\n\n" + code;
    }

    // Fix common selector issues
    code = code.replace(/page\.getElementById\(/g, 'page.locator("#');
    code = code.replace(/page\.querySelector\(/g, 'page.locator("');

    return code;
  }

  _postProcessCypress(code) {
    // Ensure Cypress types reference
    if (!code.includes('/// <reference types="cypress" />')) {
      code = '/// <reference types="cypress" />\n\n' + code;
    }

    // Fix common Cypress selector issues
    code = code.replace(/cy\.querySelector\(/g, 'cy.get("');
    code = code.replace(/cy\.getElementById\(/g, 'cy.get("#');

    return code;
  }

  _postProcessSelenium(code) {
    // Ensure proper Selenium imports
    if (
      !code.includes("const { Builder, By, until") &&
      !code.includes("require('selenium-webdriver')")
    ) {
      code =
        "const { Builder, By, until, Key } = require('selenium-webdriver');\n\n" +
        code;
    }

    return code;
  }

  _validateGeneratedCode(code, framework) {
    const validation = {
      hasImports: false,
      hasHelpers: false,
      hasTests: false,
      hasAsyncPatterns: false,
      estimatedTestCount: 0,
      issues: [],
    };

    // Check for required imports
    const importPatterns = {
      playwright: /require\(['"]@playwright\/test['"]\)/,
      cypress: /reference types=['"]cypress['"]|cypress/i,
      selenium: /require\(['"]selenium-webdriver['"]\)/,
    };

    validation.hasImports = importPatterns[framework]?.test(code) || false;

    // Check for helper functions
    validation.hasHelpers = /async function|function/.test(code);

    // Check for test functions
    const testMatches = code.match(/test\(|it\(/g);
    validation.hasTests = testMatches !== null;
    validation.estimatedTestCount = testMatches ? testMatches.length : 0;

    // Check for async patterns
    validation.hasAsyncPatterns = /async|await/.test(code);

    // Identify potential issues
    if (!validation.hasImports) {
      validation.issues.push(`Missing ${framework} imports`);
    }
    if (!validation.hasTests) {
      validation.issues.push("No test functions found");
    }
    if (framework === "playwright" && !validation.hasAsyncPatterns) {
      validation.issues.push("Missing async/await patterns for Playwright");
    }

    return validation;
  }

  _generateTestMetadata(formAnalysis) {
    return {
      fieldsCount: Object.keys(formAnalysis.fields || {}).length,
      scenariosCount: (formAnalysis.recommendedTestScenarios || []).length,
      validationRulesCount: Object.values(formAnalysis.fields || {}).reduce(
        (sum, field) => sum + (field.validation?.length || 0),
        0
      ),
      estimatedExecutionTime: this._estimateExecutionTime(formAnalysis),
      generatedAt: new Date().toISOString(),
      constraints: formAnalysis.constraints || null,
    };
  }

  _estimateExecutionTime(formAnalysis) {
    const scenarioCount = (formAnalysis.recommendedTestScenarios || []).length;
    // Rough estimation: 15 seconds per scenario + 10 seconds setup
    const estimatedSeconds = scenarioCount * 15 + 10;
    return `${Math.ceil(estimatedSeconds / 60)} minutes`;
  }

  // Utility methods
  static getSupportedFrameworks() {
    return Object.keys(ConfigHelper.getFrameworkTemplate("playwright"));
  }

  static getCodeGeneratorInfo() {
    return ConfigHelper.getAgent("TEST_CODE_GENERATOR");
  }
}

module.exports = {
  TestGenerator,
};
