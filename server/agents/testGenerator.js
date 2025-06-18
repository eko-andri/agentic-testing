const callOllamaLLM = require("../utils/llmOllama");
const { ConfigHelper, DEFAULT_OPTIONS } = require("./config/prompts");

class TestGenerator {
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.framework = options.framework || "playwright";
    this.timeout = options.timeout || 5000;
    this.baseUrl = options.baseUrl || "http://localhost:3000";
    this.enableAccessibility = options.enableAccessibility || false;
    this.enableSelfReflection = options.enableSelfReflection !== false; // Default true
    this.maxIterations = options.maxIterations || 3;

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
          prompt: `Generating tests for ${testUrl} using ${framework} and "\n"form"\n" ${JSON.stringify(formAnalysis)}`,
        }
      );

      // Validate input
      this._validateFormAnalysis(formAnalysis);

      // Step 1: Initial test code generation
      let testCode = await this._generateFrameworkSpecificCode(
        formAnalysis,
        testUrl,
        framework,
        { includeSetup, includeTeardown, generateDataTestIds }
      );

      // Step 2: Self-reflection and iterative improvement
      if (this.enableSelfReflection) {
        testCode = await this._performSelfReflection(
          testCode,
          formAnalysis,
          testUrl,
          framework,
          options
        );
      }

      // Step 3: Final post-processing
      const optimizedCode = this._postProcessCode(testCode, framework);

      // Step 4: Final validation
      const validationReport = this._validateGeneratedCode(
        optimizedCode,
        framework,
        formAnalysis
      );

      this.progressCallback("✅ Test Generator\nTest generation completed", {
        code: optimizedCode,
        preview: `Generated ${
          (formAnalysis.recommendedTestScenarios || []).length
        } quality-assured test scenarios`,
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

  async _performSelfReflection(
    testCode,
    formAnalysis,
    testUrl,
    framework,
    options
  ) {
    this.progressCallback(
      "🔄 Test Generator\nPerforming quality assurance and improvement...",
      {
        status:
          "Analyzing generated test code for accuracy and completeness...",
      }
    );

    let currentCode = testCode;
    let iteration = 1;

    while (iteration <= this.maxIterations) {
      this.progressCallback(
        `🔄 Test Generator\nQuality check iteration ${iteration}/${this.maxIterations}...`,
        {
          status: "Validating test logic against form requirements...",
        }
      );

      // Analyze current code quality
      const qualityAnalysis = await this._analyzeTestQuality(
        currentCode,
        formAnalysis,
        framework
      );

      console.log(`Quality Analysis Iteration ${iteration}:`, {
        score: qualityAnalysis.score,
        issues: qualityAnalysis.issues.length,
        improvements: qualityAnalysis.suggestedImprovements.length,
      });

      // If quality is good enough, break
      if (qualityAnalysis.score >= 85 && qualityAnalysis.issues.length === 0) {
        this.progressCallback(
          "✅ Test Generator\nQuality assurance passed - code meets standards",
          {
            preview: `Quality score: ${qualityAnalysis.score}/100 - No critical issues found`,
          }
        );
        break;
      }

      // If this is the last iteration, use current code
      if (iteration === this.maxIterations) {
        this.progressCallback(
          "⚠️ Test Generator\nMax iterations reached - using best available code",
          {
            preview: `Final quality score: ${qualityAnalysis.score}/100`,
          }
        );
        break;
      }

      // Generate improved code
      const improvedCode = await this._generateImprovedCode(
        currentCode,
        qualityAnalysis,
        formAnalysis,
        framework
      );

      currentCode = improvedCode;
      iteration++;
    }

    return currentCode;
  }

  async _analyzeTestQuality(testCode, formAnalysis, framework) {
    this.progressCallback("🔍 Test Generator\nAnalyzing test code quality...");

    if (!ConfigHelper.hasAgent("TEST_QUALITY_ANALYZER")) {
      console.warn(
        "TEST_QUALITY_ANALYZER not available - skipping quality analysis"
      );
      return {
        score: 75,
        issues: [],
        suggestedImprovements: [],
        approved: true,
      };
    }

    const prompt = ConfigHelper.buildPrompt(
      "TEST_QUALITY_ANALYZER",
      testCode,
      formAnalysis,
      framework
    );

    try {
      const result = await callOllamaLLM({
        prompt,
        system: ConfigHelper.getSystemPrompt("TEST_QUALITY_ANALYZER"),
        temperature: ConfigHelper.getTemperature("TEST_QUALITY_ANALYZER"),
      });

      return this._parseQualityAnalysis(result);
    } catch (error) {
      console.error("Quality analysis failed:", error);
      return {
        score: 60,
        issues: [`Quality analysis failed: ${error.message}`],
        suggestedImprovements: [],
        approved: false,
      };
    }
  }

  async _generateImprovedCode(
    currentCode,
    qualityAnalysis,
    formAnalysis,
    framework
  ) {
    this.progressCallback(
      "🔧 Test Generator\nGenerating improved test code...",
      {
        status: `Addressing ${qualityAnalysis.issues.length} issues and ${qualityAnalysis.suggestedImprovements.length} improvements...`,
      }
    );

    if (!ConfigHelper.hasAgent("TEST_CODE_IMPROVER")) {
      console.warn("TEST_CODE_IMPROVER not available - returning current code");
      return currentCode;
    }

    const prompt = ConfigHelper.buildPrompt(
      "TEST_CODE_IMPROVER",
      currentCode,
      qualityAnalysis,
      formAnalysis,
      framework
    );

    try {
      const improvedCode = await callOllamaLLM({
        prompt,
        system: ConfigHelper.getSystemPrompt("TEST_CODE_IMPROVER"),
        temperature: ConfigHelper.getTemperature("TEST_CODE_IMPROVER"),
      });

      // Clean the improved code
      return improvedCode
        .replace(/```[a-zA-Z]*\n/g, "")
        .replace(/```/g, "")
        .trim();
    } catch (error) {
      console.error("Code improvement failed:", error);
      return currentCode; // Return original if improvement fails
    }
  }

  _parseQualityAnalysis(analysisResult) {
    try {
      // Remove markdown and clean
      let cleaned = analysisResult
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const parsed = JSON.parse(cleaned);

      return {
        score: parsed.score || 70,
        issues: parsed.issues || [],
        suggestedImprovements: parsed.suggestedImprovements || [],
        approved: parsed.approved || false,
        coverage: parsed.coverage || {},
        recommendations: parsed.recommendations || [],
      };
    } catch (error) {
      console.error("Failed to parse quality analysis:", error);
      return {
        score: 65,
        issues: ["Failed to parse quality analysis"],
        suggestedImprovements: [],
        approved: false,
      };
    }
  }

  _validateFormAnalysis(formAnalysis) {
    if (!formAnalysis || typeof formAnalysis !== "object") {
      throw new Error("Invalid form analysis: must be an object");
    }

    if (!formAnalysis.fields || Object.keys(formAnalysis.fields).length === 0) {
      throw new Error("Invalid form analysis: no fields found");
    }

    // Enhanced validation
    const requiredProperties = ["fields", "recommendedTestScenarios"];
    const missingProperties = requiredProperties.filter(
      (prop) => !formAnalysis[prop]
    );

    if (missingProperties.length > 0) {
      console.warn(
        `Form analysis missing properties: ${missingProperties.join(", ")}`
      );
    }

    // Validate test scenarios have required structure
    if (formAnalysis.recommendedTestScenarios) {
      formAnalysis.recommendedTestScenarios.forEach((scenario, index) => {
        if (!scenario.steps || !Array.isArray(scenario.steps)) {
          console.warn(`Scenario ${index} missing steps array`);
        }
      });
    }
  }

  async _generateFrameworkSpecificCode(
    formAnalysis,
    testUrl,
    framework,
    options
  ) {
    this.progressCallback(
      `🧪 Test Generator\nGenerating initial ${framework} test code...`,
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
        `✅ Test Generator\nInitial ${framework} test code generated`,
        {
          preview: `Generated ${
            (formAnalysis.recommendedTestScenarios || []).length
          } test scenarios - proceeding to quality validation...`,
        }
      );

      return code;
    } catch (error) {
      throw new Error(
        `Failed to generate ${framework} test code: ${error.message}`
      );
    }
  }

  _postProcessCode(rawCode, framework) {
    this.progressCallback(
      "🧪 Test Generator\nPost-processing and optimizing code..."
    );

    // Clean up the generated code
    let cleanedCode = rawCode
      .replace(/```[a-zA-Z]*\n/g, "")
      .replace(/```/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\r/g, "")
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

    // Add helper functions if needed
    if (
      code.includes("getDateForAge") &&
      !code.includes("function getDateForAge")
    ) {
      const helperFunction = `
// Helper function for dynamic date calculations
function getDateForAge(years, offsetDays = 0) {
  const today = new Date();
  const targetDate = new Date(
    today.getFullYear() - years,
    today.getMonth(),
    today.getDate() + offsetDays
  );
  return targetDate.toISOString().split('T')[0];
}
`;
      code = code.replace(
        "const { test, expect } = require('@playwright/test');",
        "const { test, expect } = require('@playwright/test');" + helperFunction
      );
    }

    return code;
  }

  _postProcessCypress(code) {
    if (!code.includes('/// <reference types="cypress" />')) {
      code = '/// <reference types="cypress" />\n\n' + code;
    }
    return code;
  }

  _postProcessSelenium(code) {
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

  _validateGeneratedCode(code, framework, formAnalysis) {
    const validation = {
      hasImports: false,
      hasHelpers: false,
      hasTests: false,
      hasAsyncPatterns: false,
      estimatedTestCount: 0,
      issues: [],
      selectorCoverage: 0,
      scenarioCoverage: 0,
    };

    // Check for required imports
    const importPatterns = {
      playwright: /require\(['"]@playwright\/test['"]\)/,
      cypress: /reference types=['"]cypress['"]|cypress/i,
      selenium: /require\(['"]selenium-webdriver['"]\)/,
    };

    validation.hasImports = importPatterns[framework]?.test(code) || false;
    validation.hasHelpers = /async function|function/.test(code);

    // Count test functions
    const testMatches = code.match(/test\(|it\(/g);
    validation.hasTests = testMatches !== null;
    validation.estimatedTestCount = testMatches ? testMatches.length : 0;
    validation.hasAsyncPatterns = /async|await/.test(code);

    // Calculate coverage
    if (formAnalysis.fields) {
      const fieldsInCode = Object.keys(formAnalysis.fields).filter(
        (fieldName) =>
          code.includes(fieldName) || code.includes(`#${fieldName}`)
      );
      validation.selectorCoverage = Math.round(
        (fieldsInCode.length / Object.keys(formAnalysis.fields).length) * 100
      );
    }

    if (formAnalysis.recommendedTestScenarios) {
      validation.scenarioCoverage = Math.round(
        (validation.estimatedTestCount /
          formAnalysis.recommendedTestScenarios.length) *
          100
      );
    }

    // Enhanced issue detection
    if (!validation.hasImports) {
      validation.issues.push(`Missing ${framework} imports`);
    }
    if (!validation.hasTests) {
      validation.issues.push("No test functions found");
    }
    if (framework === "playwright" && !validation.hasAsyncPatterns) {
      validation.issues.push("Missing async/await patterns for Playwright");
    }
    if (validation.selectorCoverage < 80) {
      validation.issues.push(
        `Low selector coverage: ${validation.selectorCoverage}%`
      );
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
      qualityAssured: this.enableSelfReflection,
    };
  }

  _estimateExecutionTime(formAnalysis) {
    const scenarioCount = (formAnalysis.recommendedTestScenarios || []).length;
    const estimatedSeconds = scenarioCount * 15 + 10;
    return `${Math.ceil(estimatedSeconds / 60)} minutes`;
  }

  // Static utility methods
  static getSupportedFrameworks() {
    return ["playwright", "cypress", "selenium"];
  }

  static getCodeGeneratorInfo() {
    return ConfigHelper.getAgent("TEST_CODE_GENERATOR");
  }

  static debugConfiguration() {
    console.log("=== TestGenerator Debug Info ===");
    const requiredAgents = [
      "TEST_CODE_GENERATOR",
      "TEST_QUALITY_ANALYZER",
      "TEST_CODE_IMPROVER",
    ];

    requiredAgents.forEach((agentName) => {
      const available = ConfigHelper.hasAgent(agentName);
      const status =
        agentName === "TEST_CODE_GENERATOR" ? "REQUIRED" : "OPTIONAL";
      console.log(`  - ${agentName}: available=${available} [${status}]`);
    });
  }
}

module.exports = {
  TestGenerator,
};
