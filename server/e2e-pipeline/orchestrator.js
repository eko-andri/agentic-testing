const { FormContextAnalyzer } = require("../agents/formContextAnalyzer");
const { TestGenerator } = require("../agents/testGenerator");
const { TestRunner } = require("../agents/utils/testRunner");
const {
  updateProgress,
  resetProgress,
} = require("../agents/utils/progressStatus");

const runner = new TestRunner();

class Orchestrator {
  constructor({
    description,
    acceptanceCriteria,
    htmlPath,
    testUrl,
    extras = [],
    enabledAgents = {
      formAnalyzer: true,
      testGenerator: true,
    },
    outputFormat = "playwright",
    framework = "playwright",
    testGeneratorOptions = {},
  }) {
    this.description = description;
    this.acceptanceCriteria = acceptanceCriteria;
    this.htmlPath = htmlPath;
    this.testUrl = testUrl;
    this.extras = extras;
    this.enabledAgents = enabledAgents;
    this.outputFormat = outputFormat;
    this.framework = framework;
    this.testGeneratorOptions = testGeneratorOptions;
    this.formContext = null;

    this.testGenerator = new TestGenerator({
      framework: this.framework,
      timeout: testGeneratorOptions.timeout || 5000,
      enableAccessibility: testGeneratorOptions.enableAccessibility || false,
      enableSelfReflection: false,
      progressCallback: this.updateProgressCallback.bind(this),
    });
  }

  updateProgressCallback(status, details = {}) {
    updateProgress({
      status,
      prompt:
        details.prompt ||
        details.error ||
        details.preview ||
        details.status ||
        "",
      playwrightCode: details.code || details.playwrightCode || undefined,
    });
  }

  async run() {
    resetProgress();

    try {
      if (this.skipIfDisabled("formAnalyzer")) {
        return this.skipResult("Form Analyzer");
      }

      // 1. Input untuk agent pertama
      this.updateProgressCallback("[1/7] Input untuk Form Analyzer", {
        prompt: `HTML Path: ${this.htmlPath}\nDescription: ${this.description}\nAcceptance Criteria: ${this.acceptanceCriteria}`,
      });

      // 2. Proses agent pertama
      this.updateProgressCallback("[2/7] Memproses Form Analyzer", {
        status: "Menjalankan analisis form...",
      });

      const analyzer = new FormContextAnalyzer({
        outputFormat: this.outputFormat,
        framework: this.framework,
        progressCallback: this.updateProgressCallback.bind(this),
      });

      const formContext = await analyzer.analyze(
        this.htmlPath,
        this.description || "",
        this.acceptanceCriteria || ""
      );

      // 3. Output agent pertama
      this.updateProgressCallback("[3/7] Output Form Analyzer", {
        preview:
          JSON.stringify(formContext, null, 2).slice(0, 500) +
          (JSON.stringify(formContext).length > 500 ? "..." : ""),
      });

      this.formContext = formContext;
      if (!formContext || this.skipIfDisabled("testGenerator")) {
        return this.skipResult("Test Generator");
      }

      // 4. Input untuk agent kedua
      this.updateProgressCallback("[4/7] Input untuk Test Generator", {
        prompt: `FormContext: ${JSON.stringify(formContext).slice(
          0,
          200
        )}...\nTest URL: ${this.testUrl}`,
      });

      // 5. Proses agent kedua
      this.updateProgressCallback("[5/7] Memproses Test Generator", {
        status: "Menjalankan test generator...",
      });

      const testResult = await this.testGenerator.generateTests(
        formContext,
        this.testUrl,
        this.testGeneratorOptions
      );

      // 6. Output agent kedua
      this.updateProgressCallback("[6/7] Output Test Generator", {
        preview:
          JSON.stringify(testResult, null, 2).slice(0, 500) +
          (JSON.stringify(testResult).length > 500 ? "..." : ""),
      });

      // 7. Selesai
      this.updateProgressCallback("[7/7] Pipeline Selesai", {
        status: "Pipeline selesai tanpa error.",
      });

      return {
        success: true,
        formAnalysis: this.formContext,
        testCode: testResult.code,
        testMetadata: testResult.metadata || {},
        validationReport: testResult.validationReport || {},
        outputFormat: this.outputFormat,
        framework: this.framework,
        reviewFeedback: testResult.feedback || "",
        executionEstimate: testResult.metadata?.estimatedExecutionTime || "",
        message: "✅ Test generation completed successfully",
      };
    } catch (error) {
      updateProgress({
        status: "❌ Pipeline Failed\nOrchestration error occurred",
        prompt: error.message,
      });

      return {
        success: false,
        message: error.message,
        formContext: this.formContext,
        error: error,
      };
    }
  }

  skipIfDisabled(agentKey) {
    return !this.enabledAgents[agentKey];
  }

  skipResult(agentLabel, extra = {}) {
    updateProgress({ status: `⏭️ Skipping ${agentLabel}` });
    return {
      success: true,
      message: `Stopped after ${agentLabel}`,
      skipped: true,
      ...extra,
    };
  }
}

module.exports = {
  Orchestrator,
};
