const callOllamaLLM = require("../utils/llmOllama");
const { ConfigHelper, DEFAULT_OPTIONS } = require("./config/prompts");

class TestGenerator {
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.framework = options.framework || "playwright";
    this.timeout = options.timeout || 5000;
    this.baseUrl = options.baseUrl || "http://localhost:3000";
    this.progressCallback = options.progressCallback || (() => {});
  }

  async generateTests(
    formAnalysis,
    testUrl,
    options = {},
    preservedPassed = []
  ) {
    const { framework = this.framework } = options;

    try {
      this._validateFormAnalysis(formAnalysis);

      const prompt = ConfigHelper.buildPrompt(
        "TEST_CODE_GENERATOR",
        formAnalysis,
        testUrl,
        framework,
        options
      );

      const code = await callOllamaLLM({
        prompt,
        system: ConfigHelper.getSystemPrompt("TEST_CODE_GENERATOR"),
        temperature: ConfigHelper.getTemperature("TEST_CODE_GENERATOR"),
      });

      const cleanedCode = this._postProcessCode(code, framework);

      const validationReport = this._validateGeneratedCode(
        cleanedCode,
        framework,
        formAnalysis
      );

      // Playwright Code Verifier Agent
      if (ConfigHelper.hasAgent("PLAYWRIGHT_CODE_VERIFIER")) {
        const verifyPrompt = ConfigHelper.buildPrompt(
          "PLAYWRIGHT_CODE_VERIFIER",
          cleanedCode,
          testUrl
        );

        this.progressCallback({
          status: "Running Playwright Code Verifier",
          playwrightCode: cleanedCode,
        });

        const raw = await callOllamaLLM({
          prompt: verifyPrompt,
          system: ConfigHelper.getSystemPrompt("PLAYWRIGHT_CODE_VERIFIER"),
          temperature: ConfigHelper.getTemperature("PLAYWRIGHT_CODE_VERIFIER"),
        });

        console.info("Playwright RAW:", raw);
        const result = this._safeParseVerifierResponse(raw);
        console.info("Playwright Verifier Result:", result);

        validationReport.verifierResult = result;

        if (result.approved === false) {
          throw new Error(
            `Playwright verifier failed. Issues: ${
              result.issues?.join(" | ") || "Unknown problems"
            }`
          );
        }
      }

      return {
        code: cleanedCode,
        framework,
        metadata: this._generateTestMetadata(formAnalysis),
        validationReport,
      };
    } catch (error) {
      this.progressCallback("❌ Test Generator\nTest generation failed", {
        error: error.message,
      });
      throw new Error(`Test generation failed: ${error.message}`);
    }
  }

  _safeParseVerifierResponse(raw) {
    try {
      return JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch (e) {
      return { approved: false, issues: ["Failed to parse verifier response"] };
    }
  }

  _validateFormAnalysis(formAnalysis) {
    if (!formAnalysis || typeof formAnalysis !== "object") {
      throw new Error("Invalid form analysis: must be an object");
    }

    if (!formAnalysis.fields || Object.keys(formAnalysis.fields).length === 0) {
      throw new Error("Invalid form analysis: no fields found");
    }
  }

  _postProcessCode(rawCode, framework) {
    let cleanedCode = rawCode
      .replace(/```[a-zA-Z]*\n/g, "")
      .replace(/```/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\r/g, "")
      .trim();

    if (framework === "playwright") {
      cleanedCode = this._postProcessPlaywright(cleanedCode);
    }

    return cleanedCode;
  }

  _postProcessPlaywright(code) {
    if (
      !code.includes("const { test, expect } = require('@playwright/test')")
    ) {
      code = "const { test, expect } = require('@playwright/test');\n\n" + code;
    }
    return code;
  }

  _validateGeneratedCode(code, framework, formAnalysis) {
    const validation = {
      hasImports: /require\(['"]@playwright\/test['"]\)/.test(code),
      hasTests: /test\(|it\(/g.test(code),
      estimatedTestCount: (code.match(/test\(|it\(/g) || []).length,
      selectorCoverage: 0,
      scenarioCoverage: 0,
      issues: [],
    };

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

    return validation;
  }

  _generateTestMetadata(formAnalysis) {
    return {
      fieldsCount: Object.keys(formAnalysis.fields || {}).length,
      scenariosCount: (formAnalysis.recommendedTestScenarios || []).length,
      estimatedExecutionTime: `${Math.ceil(
        ((formAnalysis.recommendedTestScenarios || []).length * 15 + 10) / 60
      )} minutes`,
      generatedAt: new Date().toISOString(),
    };
  }
}

module.exports = {
  TestGenerator,
};
