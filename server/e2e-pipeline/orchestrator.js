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

      this.formContext = formContext;
      if (!formContext || this.skipIfDisabled("testGenerator")) {
        return this.skipResult("Test Generator", { formContext });
      }

      const testUrl = this.testUrl;
      const generationOptions = {
        framework: this.framework,
        includeSetup: this.testGeneratorOptions.includeSetup !== false,
        includeTeardown: this.testGeneratorOptions.includeTeardown !== false,
        generateDataTestIds:
          this.testGeneratorOptions.generateDataTestIds || false,
      };

      let attempt = 1;
      let preservedPassed = [];
      let verifierIssues = [];

      while (attempt <= 3) {
        updateProgress({ status: `🧪 Test Generation Attempt ${attempt}` });

        let testResult;

        try {
          testResult = await this.testGenerator.generateTests(
            formContext,
            testUrl,
            generationOptions,
            preservedPassed
          );
        } catch (err) {
          verifierIssues.push(err.message);
          attempt++;
          continue; // 🛑 Skip ke iterasi berikutnya
        }

        if (!testResult || !testResult.code) {
          attempt++;
          continue;
        }

        const runResult = await runner.runTestCode(testResult.code);

        if (!runResult || !Array.isArray(runResult.failed)) {
          throw new Error("Test runner did not return valid results");
        }

        if (runResult.errors && runResult.errors.length > 0) {
          throw new Error(
            `Test execution failed: ${runResult.errors
              .map((e) => e.message)
              .join(" | ")}`
          );
        }

        if (runResult.failed.length === 0) {
          const scenarioCount =
            testResult?.metadata?.scenariosCount || preservedPassed.length || 0;

          updateProgress({
            status: "✅ Pipeline Completed\nTest generation successful",
            playwrightCode: testResult.code,
            prompt: `Generated ${scenarioCount} test scenarios for ${this.framework}`,
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
            executionEstimate:
              testResult.metadata?.estimatedExecutionTime || "",
            message: "✅ Test generation completed successfully",
          };
        }

        preservedPassed = runResult.passed || [];
        this.formContext.recommendedTestScenarios = runResult.failed || [];

        // 🧠 Simpan issue terakhir dari verifier untuk dikirim ke UI
        if (testResult.validationReport?.verifierResult?.issues) {
          verifierIssues = testResult.validationReport.verifierResult.issues;
        }

        attempt++;
      }

      updateProgress({
        status: "❌ Pipeline Failed\nExceeded max retries",
        prompt:
          verifierIssues.length > 0
            ? `Verifier issues:\n- ${verifierIssues.join("\n- ")}`
            : "Test generation failed after 3 attempts",
      });

      return {
        success: false,
        message: "Test generation failed after 3 attempts",
        formContext: this.formContext,
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
