const { FormContextAnalyzer } = require("../agents/formContextAnalyzer");
const { TestGenerator } = require("../agents/testGenerator");

const {
  updateProgress,
  resetProgress,
} = require("../agents/utils/progressStatus");

class Orchestrator {
  constructor({
    description,
    acceptanceCriteria,
    htmlPath,
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
    this.extras = extras;
    this.enabledAgents = enabledAgents;
    this.outputFormat = outputFormat;
    this.framework = framework;
    this.testGeneratorOptions = testGeneratorOptions;
    this.formContext = null;

    this.testGenerator = new TestGenerator({
      framework: this.framework,
      timeout: testGeneratorOptions.timeout || 5000,
      baseUrl: testGeneratorOptions.baseUrl || "http://localhost:3000",
      enableAccessibility: testGeneratorOptions.enableAccessibility || false,
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
      // Step 1: Form Analysis
      if (this.skipIfDisabled("formAnalyzer")) {
        return this.skipResult("Form Analyzer");
      }

      this.formContext = await this.runAgentStep("Form Analyzer", async () => {
        const analyzer = new FormContextAnalyzer({
          outputFormat: this.outputFormat,
          framework: this.framework,
          progressCallback: this.updateProgressCallback.bind(this),
        });

        return await analyzer.analyze(
          this.htmlPath,
          this.description || "",
          this.acceptanceCriteria || ""
        );
      });

      if (!this.formContext) {
        return { success: false, message: "Form analysis failed" };
      }

      // Step 2: Test Generation (internal quality + improvement included)
      if (this.skipIfDisabled("testGenerator")) {
        return this.skipResult("Test Generator", {
          formContext: this.formContext,
        });
      }

      const testGenerationResult = await this.runAgentStep(
        "Test Generator",
        async () => {
          const testUrl = this.buildTestUrl();

          const generationOptions = {
            framework: this.framework,
            includeSetup: this.testGeneratorOptions.includeSetup !== false,
            includeTeardown:
              this.testGeneratorOptions.includeTeardown !== false,
            generateDataTestIds:
              this.testGeneratorOptions.generateDataTestIds || false,
          };

          return await this.testGenerator.generateTests(
            this.formContext,
            testUrl,
            generationOptions
          );
        }
      );

      if (!testGenerationResult?.code) {
        return {
          success: false,
          message: "Test generation failed",
          formContext: this.formContext,
        };
      }

      // Final success
      updateProgress({
        status: "✅ Pipeline Completed\nTest generation successful",
        playwrightCode: testGenerationResult.code,
        prompt: `Generated ${testGenerationResult.metadata.scenariosCount} test scenarios for ${this.framework}`,
      });

      return {
        success: true,
        formAnalysis: this.formContext,
        testCode: testGenerationResult.code,
        testMetadata: testGenerationResult.metadata,
        validationReport: testGenerationResult.validationReport,
        outputFormat: this.outputFormat,
        framework: this.framework,
        reviewFeedback: testGenerationResult.feedback || "",
        executionEstimate: testGenerationResult.metadata.estimatedExecutionTime,
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

  buildTestUrl() {
    if (this.htmlPath.startsWith("http")) return this.htmlPath;
    if (this.htmlPath.startsWith("/")) return `file://${this.htmlPath}`;

    const baseUrl =
      this.testGeneratorOptions.baseUrl || "http://localhost:3000";
    return `${baseUrl}/${this.htmlPath}`;
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

  async runAgentStep(name, agentFn) {
    try {
      return await agentFn();
    } catch (err) {
      updateProgress({ status: `❌ ${name} failed`, prompt: err.message });
      throw err;
    }
  }
}

module.exports = {
  Orchestrator,
};
