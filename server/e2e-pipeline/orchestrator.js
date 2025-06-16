const { FormContextAnalyzer } = require("../agents/formContextAnalyzer");
const { TestGenerator } = require("../agents/testGenerator");
const TestReviewAgent = require("../agents/testReviewAgent");
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
      reviewAgent: true,
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

    // Initialize test generator with progress callback
    this.testGenerator = new TestGenerator({
      framework: this.framework,
      timeout: testGeneratorOptions.timeout || 5000,
      baseUrl: testGeneratorOptions.baseUrl || "http://localhost:3000",
      enableAccessibility: testGeneratorOptions.enableAccessibility || false,
      progressCallback: this.updateProgressCallback.bind(this),
    });
  }

  // Progress callback for all agents
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

        const result = await analyzer.analyze(
          this.htmlPath,
          this.description || "",
          this.acceptanceCriteria || ""
        );

        console.log("[Progress] Form analysis completed:", result);
        return result;
      });

      if (!this.formContext) {
        return { success: false, message: "Form analysis failed" };
      }

      // Step 2: Test Generation
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

          const result = await this.testGenerator.generateTests(
            this.formContext,
            testUrl,
            generationOptions
          );

          console.log("[Progress] Test generation completed:", {
            framework: result.framework,
            testCount: result.metadata.scenariosCount,
            estimatedTime: result.metadata.estimatedExecutionTime,
          });

          return result;
        }
      );

      if (!testGenerationResult || !testGenerationResult.code) {
        return {
          success: false,
          message: "Test generation failed",
          formContext: this.formContext,
        };
      }

      // Step 3: Code Review
      if (this.skipIfDisabled("reviewAgent")) {
        return this.skipResult("Review Agent", {
          formContext: this.formContext,
          testCode: testGenerationResult.code,
          testMetadata: testGenerationResult.metadata,
        });
      }

      const reviewResult = await this.runAgentStep("Review Agent", async () => {
        updateProgress({
          status:
            "🔍 Review Agent\nAnalyzing code quality and best practices...",
        });

        const agent = new TestReviewAgent();

        const reviewOptions = {
          framework: this.framework,
          outputFormat: this.outputFormat,
          checkSyntax: true,
          checkBestPractices: true,
          checkAccessibility:
            this.testGeneratorOptions.enableAccessibility || false,
          testMetadata: testGenerationResult.metadata,
          validationReport: testGenerationResult.validationReport,
        };

        const result = await agent.evaluate(
          testGenerationResult.code,
          reviewOptions
        );

        updateProgress({
          status: result.approved
            ? "✅ Review Agent\nCode quality review passed"
            : "❌ Review Agent\nCode quality review failed",
          playwrightCode: testGenerationResult.code,
        });

        return {
          approved: result.approved,
          code: testGenerationResult.code,
          message: result.feedback || "Review completed",
          score: result.score || 0,
        };
      });

      if (!reviewResult) {
        return {
          success: false,
          message: "Review failed",
          formContext: this.formContext,
          testCode: testGenerationResult.code,
        };
      }

      // Final success
      updateProgress({
        status: "✅ Pipeline Completed\nTest generation successful",
        playwrightCode: reviewResult.code,
        prompt: `Generated ${testGenerationResult.metadata.scenariosCount} test scenarios for ${this.framework}`,
      });

      return {
        success: true,
        formAnalysis: this.formContext,
        testCode: reviewResult.code,
        testMetadata: testGenerationResult.metadata,
        validationReport: testGenerationResult.validationReport,
        outputFormat: this.outputFormat,
        framework: this.framework,
        reviewFeedback: reviewResult.message,
        executionEstimate: testGenerationResult.metadata.estimatedExecutionTime,
        message: "✅ Test generation completed successfully",
      };
    } catch (error) {
      updateProgress({
        status: "❌ Pipeline Failed\nOrchestration error occurred",
        prompt: error.message,
      });

      console.error("Orchestrator error:", error);

      return {
        success: false,
        message: error.message,
        formContext: this.formContext,
        error: error,
      };
    }
  }

  buildTestUrl() {
    if (this.htmlPath.startsWith("http")) {
      return this.htmlPath;
    }

    if (this.htmlPath.startsWith("/")) {
      return `file://${this.htmlPath}`;
    }

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
      const result = await agentFn();
      return result;
    } catch (err) {
      updateProgress({
        status: `❌ ${name} failed`,
        prompt: err.message,
      });
      throw err;
    }
  }
}

module.exports = {
  Orchestrator,
};
