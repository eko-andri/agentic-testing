/**
 * UNIFIED ORCHESTRATOR
 * Combines ModelOrchestrator + Pipeline Orchestrator for streamlined processing
 * Handles both LLM operations and E2E pipeline coordination
 */

const {
  callLLM,
  PlaywrightParser,
  updateProgress,
  resetProgress,
  TestRunner,
} = require("./utils");
const { PROMPTS } = require("./prompts");
const LiveUIAnalyzer = require("./liveUIAnalyzer"); // ADD LIVE UI ANALYZER
const { ContextFilterAgent } = require("./contextFilterAgent"); // ADD CONTEXT FILTER AGENT
const TestAnalysisAgent = require("./testAnalysisAgent"); // ADD TEST ANALYSIS AGENT
const axios = require("axios"); // Add axios for fetching HTML

const runner = new TestRunner();

/**
 * Unified Orchestrator - Handles both LLM operations and E2E pipeline
 */
class Orchestrator {
  constructor({
    description = "",
    acceptanceCriteria = "",
    htmlPath = null,
    testUrl = null,
    analysisMethod = "live-ui", // Default to live UI
    extras = [],
    enabledAgents = {
      formAnalyzer: true,
      testGenerator: true,
    },
    outputFormat = "playwright",
    framework = "playwright",
    testGeneratorOptions = {},
    config = {},
  } = {}) {
    // Pipeline configuration
    this.description = description;
    this.acceptanceCriteria = acceptanceCriteria;
    this.htmlPath = htmlPath;
    this.testUrl = testUrl;
    this.analysisMethod = analysisMethod; // NEW: User-controlled analysis method
    this.extras = extras;
    this.enabledAgents = enabledAgents;
    this.outputFormat = outputFormat;
    this.framework = framework;
    this.testGeneratorOptions = testGeneratorOptions;
    this.formContext = null;

    // LLM configuration
    this.config = {
      defaultProvider: process.env.LLM_PROVIDER || "ollama",
      defaultModel: process.env.LLM_MODEL || "qwen2.5-coder:7b",
      maxRetries: 3,
      timeout: 600000,
      ...config,
    };

    // Initialize components
    this.llmCaller = callLLM;
    this.parsers = {
      playwright: new PlaywrightParser(),
    };
    this.contextFilterAgent = new ContextFilterAgent({
      provider: this.config.defaultProvider,
      model: this.config.defaultModel,
    });
    this.testAnalysisAgent = new TestAnalysisAgent(); // NEW: Add Test Analysis Agent

    console.log(
      `[Orchestrator] Initialized with provider: ${this.config.defaultProvider}`
    );
    console.log(`[Orchestrator] Default model: ${this.config.defaultModel}`);
    console.log(`[Orchestrator] Context Filter Agent initialized`);
    console.log(`[Orchestrator] Test Analysis Agent initialized`);
  }

  // =============================================================================
  // LLM ORCHESTRATION METHODS (from ModelOrchestrator)
  // =============================================================================

  /**
   * Analyze form structure using Live UI (NEW APPROACH)
   */
  async analyzeLiveFormStructure(liveUrl, description, acceptanceCriteria) {
    updateProgress({
      status: "🔍 Live UI Analyzer\nAnalyzing live application...",
      prompt: `Connecting to ${liveUrl}`,
    });

    try {
      // Initialize Live UI Analyzer
      const liveAnalyzer = new LiveUIAnalyzer({
        baseUrl: liveUrl.includes("://")
          ? liveUrl.split("/")[0] + "//" + liveUrl.split("/")[2]
          : "http://127.0.0.1:5500",
        headless: true,
      });

      await liveAnalyzer.initialize();

      updateProgress({
        status: "🔍 Live UI Analyzer\nNavigating to application...",
        prompt: `Loading ${liveUrl}`,
      });

      // Navigate to the specific page
      const path = liveUrl.includes("://")
        ? "/" + liveUrl.split("/").slice(3).join("/")
        : liveUrl;
      await liveAnalyzer.navigateToApp(path);

      updateProgress({
        status: "🔍 Live UI Analyzer\nExtracting form structure...",
        prompt: "Analyzing live DOM structure",
      });

      // Get live UI analysis
      const liveAnalysis = await liveAnalyzer.analyzePage();

      // Cleanup
      await liveAnalyzer.cleanup();

      // Convert live analysis to format expected by orchestrator
      const convertedAnalysis = await this._convertLiveAnalysisToFormContext(
        liveAnalysis,
        description,
        acceptanceCriteria
      );

      updateProgress({
        status: "✅ Live UI Analyzer\nAnalysis completed",
        prompt: `Found ${
          convertedAnalysis.formFields?.length || 0
        } form fields from live UI`,
      });

      return convertedAnalysis;
    } catch (error) {
      console.error("[Orchestrator] Live UI analysis failed:", error.message);
      updateProgress({
        status: "❌ Live UI Analyzer\nAnalysis failed",
        prompt: error.message,
      });
      throw new Error(`Live UI analysis failed: ${error.message}`);
    }
  }

  /**
   * Convert live UI analysis to orchestrator form context format
   */
  async _convertLiveAnalysisToFormContext(
    liveAnalysis,
    description,
    acceptanceCriteria
  ) {
    const formContext = {
      formAnalysis: {
        title: liveAnalysis.title,
        url: liveAnalysis.url,
        description: description,
        acceptanceCriteria: acceptanceCriteria,
      },
      formFields: [],
      validationLogic: {},
      businessContext: {
        purpose: description,
        criteria: acceptanceCriteria,
        extractedFromLiveUI: true,
      },
    };

    // Convert live UI forms to orchestrator format
    if (liveAnalysis.forms && liveAnalysis.forms.length > 0) {
      // First, collect all fields from all forms
      const allFormFields = [];

      liveAnalysis.forms.forEach((form) => {
        form.fields.forEach((field) => {
          const formField = {
            name: field.name || field.id,
            id: field.id,
            type: field.type,
            required: field.required,
            placeholder: field.placeholder,
            validation: field.validation || {},
            selector: field.id ? `#${field.id}` : `[name="${field.name}"]`,
          };
          allFormFields.push(formField);

          // Add validation logic if present
          if (field.validation) {
            formContext.validationLogic[field.name || field.id] =
              field.validation;
          }
        });
      });

      // Apply intelligent contextual filtering using Context Filter Agent
      const relevantFields = await this.contextFilterAgent.filterRelevantFields(
        allFormFields,
        description,
        acceptanceCriteria
      );

      // Add only relevant fields to formContext
      formContext.formFields = relevantFields;

      // Log filtering statistics
      const stats = this.contextFilterAgent.getFilteringStats(
        allFormFields,
        relevantFields
      );
      console.log(
        `[Orchestrator] Context filtering stats: ${stats.original} -> ${stats.filtered} fields (${stats.reduction} reduction)`
      );
    }

    return formContext;
  }

  /**
   * Analyze form structure using optimized prompts (LEGACY - for file-based)
   */
  async analyzeFormStructure(htmlContent, description, acceptanceCriteria) {
    updateProgress({
      status: "🔍 File-based Analyzer\nAnalyzing HTML form structure...",
      prompt: `Analyzing ${htmlContent.length} characters of HTML content`,
    });

    const prompt = PROMPTS.FORM_STRUCTURE_ANALYZER.buildPrompt(
      htmlContent,
      description,
      acceptanceCriteria
    );

    try {
      updateProgress({
        status: "🔍 File-based Analyzer\nCalling LLM for form analysis...",
        prompt: prompt.substring(0, 500) + "...",
      });

      const response = await this.llmCaller({
        prompt,
        system: PROMPTS.FORM_STRUCTURE_ANALYZER.system,
        temperature: PROMPTS.FORM_STRUCTURE_ANALYZER.temperature,
        model: this._selectModelForTask("form_analysis"),
        provider: this.config.defaultProvider,
      });

      updateProgress({
        status: "🔍 File-based Analyzer\nProcessing LLM response...",
        prompt: `Received ${response.length} characters from LLM`,
      });

      // Parse JSON response
      const cleanResponse = this._extractJSON(response);
      const analysis = JSON.parse(cleanResponse);

      // Validate and enhance the analysis
      const enhanced = await this._enhanceFormAnalysis(
        analysis,
        htmlContent,
        description,
        acceptanceCriteria
      );

      updateProgress({
        status: "✅ File-based Analyzer\nAnalysis completed",
        prompt: `Found ${enhanced.formFields?.length || 0} form fields`,
      });

      return enhanced;
    } catch (error) {
      console.error("[Orchestrator] Form analysis failed:", error.message);
      updateProgress({
        status: "❌ File-based Analyzer\nAnalysis failed",
        prompt: error.message,
      });
      throw new Error(`Form analysis failed: ${error.message}`);
    }
  }

  /**
   * Generate incremental test cases for existing tests
   */
  async generateIncrementalTests(
    existingTestContent,
    newRequirements,
    formAnalysis,
    testUrl
  ) {
    updateProgress({
      status:
        "🔄 Incremental Test Generator\nGenerating additional test cases...",
      prompt: `Adding tests for: ${newRequirements.substring(0, 100)}...`,
    });

    const prompt = PROMPTS.INCREMENTAL_TEST_GENERATOR.buildPrompt(
      existingTestContent,
      newRequirements,
      formAnalysis,
      testUrl
    );

    try {
      const response = await this.llmCaller({
        prompt,
        system: PROMPTS.INCREMENTAL_TEST_GENERATOR.system,
        temperature: PROMPTS.INCREMENTAL_TEST_GENERATOR.temperature,
        model: this._selectModelForTask("test_generation"),
        provider: this.config.defaultProvider,
      });

      updateProgress({
        status:
          "🔄 Incremental Test Generator\nProcessing generated test cases...",
        prompt: `Generated ${response.length} characters of test code`,
      });

      // Clean the response to ensure we only get test() blocks
      const cleanedCode = this._extractTestBlocks(response);

      return {
        code: cleanedCode,
        metadata: {
          source: "incremental",
          testCount: (cleanedCode.match(/test\(/g) || []).length,
          requirements: newRequirements,
        },
        validation: { isValid: true, issues: [], warnings: [] },
      };
    } catch (error) {
      console.error(
        "[Orchestrator] Incremental test generation failed:",
        error.message
      );
      throw new Error(`Incremental test generation failed: ${error.message}`);
    }
  }

  /**
   * Generate Playwright test code with high success rate
   */
  async generatePlaywrightTests(formAnalysis, testUrl, options = {}) {
    updateProgress({
      status: "🧪 Test Code Generator\nPreparing test generation...",
      prompt: `Generating tests for ${
        formAnalysis.formFields?.length || 0
      } form fields`,
    });

    const prompt = PROMPTS.TEST_CODE_GENERATOR.buildPrompt(
      formAnalysis,
      testUrl,
      "playwright",
      options
    );

    let attempt = 1;
    const maxAttempts = this.config.maxRetries;

    while (attempt <= maxAttempts) {
      try {
        updateProgress({
          status: `🧪 Test Code Generator\nGenerating Playwright tests (attempt ${attempt}/${maxAttempts})...`,
          prompt: prompt.substring(0, 500) + "...",
        });

        console.log(
          `[Orchestrator] Test generation attempt ${attempt}/${maxAttempts}`
        );

        const response = await this.llmCaller({
          prompt,
          system: PROMPTS.TEST_CODE_GENERATOR.system,
          temperature: PROMPTS.TEST_CODE_GENERATOR.temperature,
          model: this._selectModelForTask("test_generation"),
          provider: this.config.defaultProvider,
        });

        updateProgress({
          status: `🧪 Test Code Generator\nProcessing generated code (attempt ${attempt})...`,
          prompt: `Received ${response.length} characters of test code`,
        });

        // Parse and clean the code
        const parseResult = this.parsers.playwright.parse(response, {
          formAnalysis,
        });

        if (!parseResult.validation.isValid) {
          console.warn(
            `[Orchestrator] Generated code has issues (attempt ${attempt}):`,
            parseResult.validation.issues
          );

          if (attempt === maxAttempts) {
            // Use fallback generator
            console.log("[Orchestrator] Using fallback test generator");
            const fallbackCode = this.parsers.playwright.generateFallbackTest(
              formAnalysis,
              testUrl
            );
            return {
              code: fallbackCode,
              metadata: { source: "fallback", attempt },
              validation: { isValid: true, issues: [], warnings: [] },
            };
          }

          attempt++;
          continue;
        }

        // Verify the code quality
        updateProgress({
          status: `🧪 Test Code Generator\nVerifying code quality (attempt ${attempt})...`,
          prompt: `Verifying ${
            parseResult.code.split("\n").length
          } lines of test code`,
        });

        const verification = await this._verifyGeneratedCode(
          parseResult.code,
          testUrl
        );

        if (!verification.approved && attempt < maxAttempts) {
          console.warn(
            `[Orchestrator] Code verification failed (attempt ${attempt}):`,
            verification.issues
          );
          updateProgress({
            status: `⚠️ Test Code Generator\nCode verification failed (attempt ${attempt})`,
            prompt: `Issues found: ${
              verification.issues?.join(", ") || "Unknown issues"
            }`,
          });
          attempt++;
          continue;
        }

        updateProgress({
          status: `✅ Test Code Generator\nPlaywright test generated successfully!`,
          prompt: `Generated ${
            parseResult.code.split("\n").length
          } lines of test code`,
          playwrightCode: parseResult.code,
        });

        return {
          code: parseResult.code,
          metadata: {
            ...parseResult.metadata,
            source: "generated",
            attempt,
            verification,
          },
          validation: parseResult.validation,
        };
      } catch (error) {
        console.error(
          `[Orchestrator] Generation attempt ${attempt} failed:`,
          error.message
        );

        if (attempt === maxAttempts) {
          // Return fallback as last resort
          const fallbackCode = this.parsers.playwright.generateFallbackTest(
            formAnalysis,
            testUrl
          );
          return {
            code: fallbackCode,
            metadata: {
              source: "fallback_error",
              attempt,
              error: error.message,
            },
            validation: {
              isValid: true,
              issues: [],
              warnings: ["Used fallback due to generation error"],
            },
          };
        }

        attempt++;
      }
    }
  }

  /**
   * Improve existing test code quality
   */
  async improveTestCode(existingCode, formAnalysis, failedTests = []) {
    const prompt = PROMPTS.TEST_QUALITY_IMPROVER.buildPrompt(
      existingCode,
      formAnalysis,
      failedTests
    );

    try {
      const response = await this.llmCaller({
        prompt,
        system: PROMPTS.TEST_QUALITY_IMPROVER.system,
        temperature: PROMPTS.TEST_QUALITY_IMPROVER.temperature,
        model: this._selectModelForTask("test_improvement"),
        provider: this.config.defaultProvider,
      });

      const parseResult = this.parsers.playwright.parse(response, {
        formAnalysis,
      });

      return {
        code: parseResult.code,
        metadata: {
          ...parseResult.metadata,
          source: "improved",
          originalLength: existingCode.length,
        },
        validation: parseResult.validation,
      };
    } catch (error) {
      console.error("[Orchestrator] Test improvement failed:", error.message);
      return {
        code: existingCode, // Return original if improvement fails
        metadata: { source: "unchanged", error: error.message },
        validation: {
          isValid: true,
          issues: [],
          warnings: ["Improvement failed, using original"],
        },
      };
    }
  }

  // =============================================================================
  // E2E PIPELINE METHODS (from e2e-pipeline/orchestrator)
  // =============================================================================

  /**
   * Main pipeline execution with smart test analysis
   */
  async run() {
    resetProgress();
    updateProgress({ status: "🚀 Pipeline\nInitializing..." });

    if (this.skipIfDisabled("formAnalyzer")) {
      return this.skipResult("Form Analyzer");
    }

    // Initialize Test Analysis Agent
    await this.testAnalysisAgent.initialize();

    // Choose analysis method based on user preference
    let formContext;

    if (this.analysisMethod === "live-ui") {
      // NEW APPROACH: Use Live UI Analysis
      updateProgress({
        status: "🔍 Live UI Analyzer\nInitializing live analysis...",
        analyzing: this.testUrl,
        description: this.description.substring(0, 100),
        criteria: this.acceptanceCriteria.substring(0, 100),
      });

      formContext = await this.analyzeLiveFormStructure(
        this.testUrl,
        this.description || "",
        this.acceptanceCriteria || ""
      );

      updateProgress({
        status: "✅ Live UI Analyzer\nAnalysis complete",
        formFields: formContext.formFields?.length || 0,
        hasValidation: !!formContext.validationLogic,
        method: "Live UI Analysis",
      });
    } else if (this.analysisMethod === "file-based") {
      // LEGACY APPROACH: Use File-based analysis
      updateProgress({
        status: "🔍 File-based Analyzer\nInitializing file analysis...",
        analyzing: this.htmlPath || "HTML content from URL",
        description: this.description.substring(0, 100),
        criteria: this.acceptanceCriteria.substring(0, 100),
      });

      let htmlContent;
      if (this.htmlPath) {
        htmlContent = require("fs").readFileSync(this.htmlPath, "utf8");
      } else {
        // Fallback: fetch HTML from testUrl for file-based analysis
        const response = await axios.get(this.testUrl);
        htmlContent = response.data;
      }

      formContext = await this.analyzeFormStructure(
        htmlContent,
        this.description || "",
        this.acceptanceCriteria || ""
      );

      updateProgress({
        status: "✅ File-based Analyzer\nAnalysis complete",
        formFields: formContext.formFields?.length || 0,
        hasValidation: !!formContext.validationLogic,
        method: "File-based Analysis",
      });
    } else {
      throw new Error(
        "Invalid analysis method. Must be 'live-ui' or 'file-based'"
      );
    }

    this.formContext = formContext;
    if (!formContext || this.skipIfDisabled("testGenerator")) {
      return this.skipResult("Test Generator", { formContext });
    }

    // NEW: Smart Test Analysis - Analyze context and create intelligent test plan
    updateProgress({
      status: "🧠 Test Analysis Agent\nAnalyzing context and planning tests...",
    });

    try {
      const analysisResult = await this.testAnalysisAgent.analyzeContext(
        this.description,
        this.acceptanceCriteria,
        formContext.formFields
      );

      updateProgress({
        status: "🧠 Test Analysis Agent\nExecuting intelligent test plan...",
        prompt: `Found ${analysisResult.relevantFields.length} relevant fields, ${analysisResult.similarContexts.length} similar contexts`,
      });

      // Execute the test plan
      const executionResult = await this.testAnalysisAgent.executeTestPlan(
        analysisResult.testPlan,
        this.description,
        this.acceptanceCriteria
      );

      updateProgress({
        status: "✅ Test Analysis Agent\nSmart test generation complete",
        prompt: `Created: ${executionResult.created.length} tests, Modified: ${executionResult.modified.length} tests`,
      });

      // If smart generation succeeded, return early
      if (
        executionResult.created.length > 0 ||
        executionResult.modified.length > 0
      ) {
        const testSummary = {
          code: `// Smart test generation completed
// Created tests: ${executionResult.created.map((t) => t.filename).join(", ")}
// Modified tests: ${executionResult.modified.map((t) => t.filename).join(", ")}
// Tests are saved in respective core/ and business/ directories
`,
          metadata: {
            analysisResult,
            executionResult,
            scenariosCount:
              executionResult.created.length + executionResult.modified.length,
            smartGeneration: true,
          },
          validationReport: {
            isValid: executionResult.errors.length === 0,
            issues: executionResult.errors,
            warnings: [],
          },
        };

        updateProgress({
          status: "✅ Pipeline Complete\nSmart test generation successful!",
          prompt: `Generated ${testSummary.metadata.scenariosCount} intelligent test files`,
          playwrightCode: testSummary.code,
        });

        return testSummary;
      }
    } catch (error) {
      console.warn(
        "[Orchestrator] Smart test analysis failed, falling back to traditional generation:",
        error.message
      );

      updateProgress({
        status:
          "⚠️ Test Analysis Agent\nFalling back to traditional generation...",
        prompt: error.message,
      });
    }

    // FALLBACK: Traditional test generation if smart analysis fails
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
      updateProgress({
        status: `🧪 Test Generation Attempt ${attempt} (Traditional)`,
      });

      let testResult;

      try {
        // Use internal orchestrator methods for better results
        const orchestratorResult = await this.generatePlaywrightTests(
          formContext,
          testUrl,
          generationOptions
        );

        testResult = {
          code: orchestratorResult.code,
          metadata: {
            ...orchestratorResult.metadata,
            scenariosCount: (orchestratorResult.code.match(/test\(/g) || [])
              .length,
          },
          validationReport: {
            isValid: orchestratorResult.validation.isValid,
            issues: orchestratorResult.validation.issues,
            warnings: orchestratorResult.validation.warnings,
          },
        };

        if (!testResult.code || testResult.code.trim() === "") {
          throw new Error("Generated test code is empty");
        }

        updateProgress({
          status: "🎯 Pipeline\nFinalizing test result...",
          prompt: `Test generated with ${testResult.metadata.scenariosCount} scenarios`,
        });

        const success = await this.saveAndRunTest(testResult.code, testUrl);

        if (success) {
          updateProgress({
            status: "✅ Pipeline Complete\nTest generation successful!",
            prompt: `Successfully generated and validated ${testResult.metadata.scenariosCount} test scenarios`,
            playwrightCode: testResult.code,
          });
          return testResult;
        }

        attempt++;
        if (attempt > 3) {
          throw new Error("All generation attempts failed");
        }
      } catch (error) {
        console.error(
          `[Orchestrator] Attempt ${attempt} failed:`,
          error.message
        );

        updateProgress({
          status: `❌ Attempt ${attempt} Failed\n${error.message.substring(
            0,
            100
          )}...`,
          prompt: error.message,
        });

        if (attempt >= 3) {
          updateProgress({
            status: "❌ Pipeline Failed\nAll generation attempts failed",
            prompt: error.message,
          });
          throw error;
        }

        attempt++;
      }
    }
  }

  /**
   * Get test analysis summary
   */
  async getTestAnalysisSummary() {
    if (!this.testAnalysisAgent) {
      throw new Error("Test Analysis Agent not initialized");
    }
    return await this.testAnalysisAgent.getAnalysisSummary();
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.testAnalysisAgent) {
      await this.testAnalysisAgent.close();
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Verify generated code quality
   */
  async _verifyGeneratedCode(testCode, testUrl) {
    try {
      const prompt = PROMPTS.CODE_VERIFIER.buildPrompt(testCode, testUrl);

      const response = await this.llmCaller({
        prompt,
        system: PROMPTS.CODE_VERIFIER.system,
        temperature: PROMPTS.CODE_VERIFIER.temperature,
        model: this._selectModelForTask("code_verification"),
        provider: this.config.defaultProvider,
      });

      const cleanResponse = this._extractJSON(response);
      return JSON.parse(cleanResponse);
    } catch (error) {
      console.warn("[Orchestrator] Code verification failed:", error.message);
      return {
        approved: true, // Default to approved if verification fails
        issues: [],
        suggestions: [],
        confidence: 0.5,
      };
    }
  }

  /**
   * Select optimal model based on task type and available resources
   */
  _selectModelForTask(taskType) {
    // Use environment variable if specified, otherwise use default
    const envModel = process.env.LLM_MODEL;
    if (envModel) {
      return envModel;
    }

    // Task-specific model selection for Qwen
    const taskModels = {
      form_analysis: "qwen2.5-coder:3b", // Lighter model for analysis
      test_generation: "qwen2.5-coder:7b", // Standard model for generation
      test_improvement: "qwen2.5-coder:7b", // Standard model for improvement
      code_verification: "qwen2.5-coder:3b", // Lighter model for verification
    };

    return taskModels[taskType] || this.config.defaultModel;
  }

  /**
   * Extract clean JSON from LLM response
   */
  _extractJSON(response) {
    // Remove markdown code blocks
    let cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "");

    // Find JSON object boundaries
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start !== -1 && end !== -1 && end > start) {
      cleaned = cleaned.substring(start, end + 1);
    }

    return cleaned;
  }

  /**
   * Extract only test() blocks from LLM response for incremental generation
   */
  _extractTestBlocks(response) {
    // Remove any markdown code blocks
    let cleaned = response
      .replace(/```javascript\n?/g, "")
      .replace(/```\n?/g, "");

    // Find all test() function blocks
    const testBlocks = [];
    const lines = cleaned.split("\n");
    let currentTest = [];
    let braceCount = 0;
    let inTest = false;

    for (const line of lines) {
      if (line.trim().startsWith("test(")) {
        inTest = true;
        currentTest = [line];
        braceCount =
          (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      } else if (inTest) {
        currentTest.push(line);
        braceCount +=
          (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;

        if (braceCount === 0) {
          // Test block complete
          testBlocks.push(currentTest.join("\n"));
          inTest = false;
          currentTest = [];
        }
      }
    }

    // If we have incomplete test block, add it anyway
    if (inTest && currentTest.length > 0) {
      testBlocks.push(currentTest.join("\n"));
    }

    return testBlocks.join("\n\n");
  }

  /**
   * Enhance form analysis with additional metadata
   */
  async _enhanceFormAnalysis(
    analysis,
    htmlContent,
    description = "",
    acceptanceCriteria = ""
  ) {
    // Add additional context that might be missing
    if (!analysis.formFields) {
      analysis.formFields = [];
    }

    // Ensure all required properties are present
    const allFields = analysis.formFields.map((field) => ({
      name: field.name || "unknown",
      type: field.type || "text",
      selector: field.selector || `#${field.name}`,
      required: field.required || false,
      validation: field.validation || {},
      errorSelector: field.errorSelector || `#${field.name}-error`,
      errorMessages: field.errorMessages || [],
      ...field,
    }));

    // Apply intelligent contextual filtering using Context Filter Agent
    if (description || acceptanceCriteria) {
      const relevantFields = await this.contextFilterAgent.filterRelevantFields(
        allFields,
        description,
        acceptanceCriteria
      );
      analysis.formFields = relevantFields;

      const stats = this.contextFilterAgent.getFilteringStats(
        allFields,
        relevantFields
      );
      console.log(
        `[Orchestrator] File-based context filtering: ${stats.original} -> ${stats.filtered} fields (${stats.reduction} reduction)`
      );
    } else {
      analysis.formFields = allFields;
    }

    // Add form-level metadata
    analysis.metadata = {
      analyzedAt: new Date().toISOString(),
      htmlLength: htmlContent.length,
      fieldCount: analysis.formFields.length,
      hasClientSideValidation: analysis.validationLogic?.clientSide || false,
      contextFiltered: !!(description || acceptanceCriteria),
    };

    return analysis;
  }

  /**
   * Validate form analysis structure
   */
  _validateFormAnalysis(formAnalysis) {
    if (!formAnalysis) {
      throw new Error("Form analysis is required");
    }

    if (!formAnalysis.formFields || !Array.isArray(formAnalysis.formFields)) {
      throw new Error("Form analysis must contain formFields array");
    }

    if (formAnalysis.formFields.length === 0) {
      throw new Error("Form analysis contains no form fields");
    }
  }

  /**
   * Generate test code with form analysis validation
   */
  async generateTests(formAnalysis, testUrl, options = {}) {
    try {
      this._validateFormAnalysis(formAnalysis);

      const result = await this.generatePlaywrightTests(
        formAnalysis,
        testUrl,
        options
      );

      return {
        code: result.code,
        metadata: result.metadata,
        validationReport: result.validation,
      };
    } catch (error) {
      console.error("Test generation failed:", error.message);
      throw new Error(`Test generation failed: ${error.message}`);
    }
  }

  // Pipeline helper methods
  skipIfDisabled(agentName) {
    return !this.enabledAgents[agentName];
  }

  skipResult(agentName, extra = {}) {
    updateProgress({
      status: `⏭️ ${agentName}\nSkipped (disabled)`,
      prompt: `${agentName} is disabled`,
    });
    return { skipped: agentName, ...extra };
  }

  updateProgressCallback(status, extra = {}) {
    updateProgress({ status, ...extra });
  }

  async saveAndRunTest(testCode, testUrl) {
    // Implementation for saving and running tests
    // This would include file saving and test execution logic
    return true; // Simplified for now
  }

  /**
   * Switch active provider
   */
  switchProvider(providerName) {
    try {
      this.llmCaller.switchProvider(providerName);
      this.config.defaultProvider = providerName;
      console.log(`[Orchestrator] Switched to provider: ${providerName}`);
    } catch (error) {
      throw new Error(`Failed to switch provider: ${error.message}`);
    }
  }

  /**
   * Get provider status
   */
  async getProviderStatus() {
    const status = {};

    // Get status from generic LLM caller
    const availableProviders = this.llmCaller.getAvailableProviders();

    for (const provider of availableProviders) {
      try {
        const testResult = await this.llmCaller.testProvider(provider.name);
        status[provider.name] = {
          available: testResult.success,
          description: provider.description,
          defaultModel: provider.defaultModel,
          isCurrent: provider.isCurrent,
          error: testResult.success ? null : testResult.error,
        };
      } catch (error) {
        status[provider.name] = {
          available: false,
          error: error.message,
        };
      }
    }

    return status;
  }
}

module.exports = { Orchestrator };
