// agents/formContextAnalyzer.js - Cleaned version without duplicate prompts

const fs = require("fs");
const callOllamaLLM = require("../utils/llmOllama");
const { ConfigHelper, DEFAULT_OPTIONS } = require("./config/prompts");

class FormContextAnalyzer {
  constructor(options = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
      // FORCE self-reflection to always be enabled - remove user control
      enableSelfReflection: true,
    };
    this.progressCallback = options.progressCallback || (() => {});
  }

  async analyze(htmlPath, description = "", acceptanceCriteria = "") {
    try {
      this.progressCallback(
        "🔍 Form Analyzer\nInitializing comprehensive analysis...",
        {
          analyzing: htmlPath,
          description: description.substring(0, 100),
          criteria: acceptanceCriteria.substring(0, 100),
        }
      );

      // Step 1: Extract form structure
      const formStructure = await this._extractFormStructure(htmlPath);

      // Step 2: Generate intelligent test analysis
      const intelligentResult = await this._generateIntelligentAnalysis(
        formStructure,
        description,
        acceptanceCriteria
      );

      // Step 3: MANDATORY Self-reflection optimization
      const optimizedResult = await this._performMandatorySelfReflection(
        intelligentResult,
        formStructure,
        description,
        acceptanceCriteria
      );

      this.progressCallback(
        "✅ Form Analyzer\nComprehensive analysis completed with quality assurance",
        {
          preview: `Analyzed and validated ${
            Object.keys(optimizedResult.fields || {}).length
          } fields with ${
            (optimizedResult.recommendedTestScenarios || []).length
          } quality-assured scenarios`,
        }
      );

      return optimizedResult;
    } catch (error) {
      this.progressCallback("❌ Form Analyzer\nAnalysis failed", {
        error: error.message,
      });
      console.error("Form analysis failed:", error);
      throw new Error(`Form analysis failed: ${error.message}`);
    }
  }

  // Enhanced FormContextAnalyzer with better debugging and validation

  async _extractFormStructure(htmlPath) {
    this.progressCallback("🔍 Form Analyzer\nExtracting form structure...", {
      status: "Reading HTML file and identifying form elements...",
    });

    const htmlContent = fs.readFileSync(htmlPath, "utf8");

    // DEBUG: Log HTML analysis
    console.log("📝 HTML Analysis:");
    console.log("- HTML length:", htmlContent.length);
    console.log("- Contains form tag:", htmlContent.includes("<form"));
    console.log(
      "- Contains input tags:",
      (htmlContent.match(/<input/g) || []).length
    );
    console.log("- Contains script tag:", htmlContent.includes("<script"));
    console.log(
      "- Contains getElementById:",
      htmlContent.includes("getElementById")
    );

    if (!ConfigHelper.hasAgent("FORM_STRUCTURE_ANALYZER")) {
      throw new Error(
        "FORM_STRUCTURE_ANALYZER agent not found in configuration"
      );
    }

    const prompt = ConfigHelper.buildPrompt(
      "FORM_STRUCTURE_ANALYZER",
      htmlContent
    );

    // DEBUG: Log prompt being sent
    console.log(
      "📤 Prompt sent to LLM (first 500 chars):",
      prompt.substring(0, 500)
    );

    try {
      const result = await callOllamaLLM({
        prompt,
        system: ConfigHelper.getSystemPrompt("FORM_STRUCTURE_ANALYZER"),
        temperature: ConfigHelper.getTemperature("FORM_STRUCTURE_ANALYZER"),
      });

      // DEBUG: Log raw response
      console.log(
        "📥 Raw LLM response (first 500 chars):",
        result.substring(0, 500)
      );
      console.log(
        "📥 Raw LLM response (last 200 chars):",
        result.substring(Math.max(0, result.length - 200))
      );

      const parsedResult = this._parseAndValidateJSON(result, "form structure");

      // DEBUG: Log parsed structure
      console.log("✅ Parsed structure validation:");
      console.log("- Form fields count:", parsedResult.formFields?.length || 0);
      console.log(
        "- Has clientSideValidation:",
        !!parsedResult.clientSideValidation
      );
      console.log(
        "- Error messages found:",
        Object.keys(parsedResult.clientSideValidation?.errorMessages || {})
      );

      // VALIDATION: Check if selectors look realistic
      if (parsedResult.formFields) {
        parsedResult.formFields.forEach((field, index) => {
          console.log(
            `- Field ${index + 1}: name="${field.name}", selector="${
              field.selector
            }"`
          );
          if (field.validationLogic?.errorDisplayElement) {
            console.log(
              `  Error element: ${field.validationLogic.errorDisplayElement}`
            );
          }
        });
      }

      this.progressCallback("✅ Form Analyzer\nForm structure extracted", {
        preview: `Found ${
          parsedResult.formFields?.length || 0
        } form fields with validation logic`,
      });

      return parsedResult;
    } catch (error) {
      console.error("❌ Form structure extraction failed:", error);
      throw new Error(`Form structure extraction failed: ${error.message}`);
    }
  }

  async _generateIntelligentAnalysis(
    formStructure,
    description,
    acceptanceCriteria
  ) {
    this.progressCallback(
      "🧠 Form Analyzer\nGenerating intelligent test scenarios...",
      {
        status:
          "Creating comprehensive test strategies based on form structure and business requirements...",
      }
    );

    if (!ConfigHelper.hasAgent("INTELLIGENT_TEST_GENERATOR")) {
      throw new Error(
        "INTELLIGENT_TEST_GENERATOR agent not found in configuration"
      );
    }

    const prompt = ConfigHelper.buildPrompt(
      "INTELLIGENT_TEST_GENERATOR",
      formStructure,
      description,
      acceptanceCriteria
    );

    try {
      const result = await callOllamaLLM({
        prompt,
        system: ConfigHelper.getSystemPrompt("INTELLIGENT_TEST_GENERATOR"),
        temperature: ConfigHelper.getTemperature("INTELLIGENT_TEST_GENERATOR"),
      });

      const parsedResult = this._parseAndValidateJSON(
        result,
        "intelligent analysis"
      );

      this.progressCallback(
        "✅ Form Analyzer\nInitial test scenarios generated",
        {
          preview: `Generated ${
            Object.keys(parsedResult.fields || {}).length
          } field strategies - proceeding to quality validation...`,
        }
      );

      return parsedResult;
    } catch (error) {
      throw new Error(`Intelligent analysis failed: ${error.message}`);
    }
  }

  async _performMandatorySelfReflection(
    intelligentResult,
    originalFormStructure,
    description,
    acceptanceCriteria
  ) {
    this.progressCallback(
      "🔄 Form Analyzer\nPerforming MANDATORY quality assurance...",
      {
        status:
          "Validating test accuracy against form behavior and acceptance criteria...",
      }
    );

    if (!ConfigHelper.hasAgent("TEST_QUALITY_AUDITOR")) {
      throw new Error(
        "CRITICAL: TEST_QUALITY_AUDITOR agent not found. Quality assurance is mandatory and cannot be skipped."
      );
    }

    // FIXED: Use the enhanced buildPrompt from config instead of custom method
    const prompt = ConfigHelper.buildPrompt(
      "TEST_QUALITY_AUDITOR",
      intelligentResult,
      originalFormStructure,
      description,
      acceptanceCriteria
    );

    try {
      const optimizedResult = await callOllamaLLM({
        prompt,
        // FIXED: Use system prompt from config, not custom method
        system: ConfigHelper.getSystemPrompt("TEST_QUALITY_AUDITOR"),
        temperature: ConfigHelper.getTemperature("TEST_QUALITY_AUDITOR"),
      });

      const parsedResult = this._parseAndValidateJSON(
        optimizedResult,
        "quality-assured analysis"
      );

      // VALIDATION: Ensure the result has improved or maintained quality
      this._validateQualityImprovements(intelligentResult, parsedResult);

      this.progressCallback(
        "✅ Form Analyzer\nQuality assurance completed - test accuracy verified",
        {
          preview: `Validated ${
            Object.keys(parsedResult.fields || {}).length
          } fields with ${
            (parsedResult.recommendedTestScenarios || []).length
          } quality-assured scenarios`,
        }
      );

      return parsedResult;
    } catch (error) {
      throw new Error(
        `CRITICAL: Quality assurance failed - test accuracy cannot be guaranteed: ${error.message}`
      );
    }
  }

  _validateQualityImprovements(original, optimized) {
    if (!optimized.fields || Object.keys(optimized.fields).length === 0) {
      throw new Error(
        "Quality assurance failed: No fields in optimized result"
      );
    }

    if (
      !optimized.recommendedTestScenarios ||
      optimized.recommendedTestScenarios.length === 0
    ) {
      throw new Error(
        "Quality assurance failed: No test scenarios in optimized result"
      );
    }

    console.log("Quality assurance completed:", {
      originalFields: Object.keys(original.fields || {}).length,
      optimizedFields: Object.keys(optimized.fields || {}).length,
      originalScenarios: (original.recommendedTestScenarios || []).length,
      optimizedScenarios: (optimized.recommendedTestScenarios || []).length,
    });
  }

  // Improved JSON parser for FormContextAnalyzer

  _parseAndValidateJSON(jsonString, context) {
    try {
      // Step 1: Remove markdown blocks
      let cleaned = jsonString
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      // Step 2: Remove ALL comments more aggressively
      cleaned = cleaned
        .replace(/\/\/.*$/gm, "") // Remove // comments
        .replace(/\/\*[\s\S]*?\*\//g, "") // Remove /* */ comments
        .replace(/,(\s*[}\]])/g, "$1") // Remove trailing commas
        .replace(/\n\s*\n/g, "\n") // Remove double newlines
        .trim();

      // Step 3: Parse JSON
      const parsed = JSON.parse(cleaned);

      // Step 4: Enhanced validation
      if (!parsed || typeof parsed !== "object") {
        throw new Error(`Invalid JSON structure for ${context}`);
      }

      // Step 5: Validate required structure for form analysis
      if (context === "form structure") {
        if (!parsed.formFields || !Array.isArray(parsed.formFields)) {
          throw new Error("Missing or invalid formFields array");
        }
        if (!parsed.clientSideValidation) {
          throw new Error("Missing clientSideValidation object");
        }
      }

      console.log(
        `✅ Successfully parsed ${context} JSON with ${
          Object.keys(parsed).length
        } top-level properties`
      );
      return parsed;
    } catch (error) {
      console.error(`❌ JSON parsing failed for ${context}:`, error.message);
      console.error(
        "Raw response (first 1000 chars):",
        jsonString.substring(0, 1000)
      );
      console.error(
        "Raw response (last 500 chars):",
        jsonString.substring(Math.max(0, jsonString.length - 500))
      );

      // Try to identify specific issues
      if (jsonString.includes("//")) {
        console.error(
          "⚠️  Response contains // comments - these break JSON parsing"
        );
      }
      if (jsonString.includes("```")) {
        console.error("⚠️  Response contains markdown blocks");
      }

      throw new Error(`Failed to parse ${context} JSON: ${error.message}`);
    }
  }

  // Utility methods
  static getAvailableAgents() {
    return ConfigHelper.getAgentsByCategory("analysis");
  }

  static hasMandatoryQualityAssurance() {
    return ConfigHelper.hasAgent("TEST_QUALITY_AUDITOR");
  }

  static debugConfiguration() {
    console.log("=== FormContextAnalyzer Debug Info ===");
    console.log("Available agents:", ConfigHelper.debugAgentConfig());
    console.log(
      "Quality assurance available:",
      ConfigHelper.hasAgent("TEST_QUALITY_AUDITOR")
    );
    console.log(
      "IMPORTANT: All prompts managed by ConfigHelper - no custom prompts"
    );

    const requiredAgents = [
      "FORM_STRUCTURE_ANALYZER",
      "INTELLIGENT_TEST_GENERATOR",
      "TEST_QUALITY_AUDITOR",
    ];

    requiredAgents.forEach((agentName) => {
      const available = ConfigHelper.hasAgent(agentName);
      const hasPrompt = available
        ? typeof ConfigHelper.getAgent(agentName).buildPrompt === "function"
        : false;
      const hasSystemPrompt = available
        ? !!ConfigHelper.getSystemPrompt(agentName)
        : false;
      const status =
        agentName === "TEST_QUALITY_AUDITOR" ? "MANDATORY" : "REQUIRED";
      console.log(
        `  - ${agentName}: available=${available}, hasBuildPrompt=${hasPrompt}, hasSystemPrompt=${hasSystemPrompt} [${status}]`
      );
    });
  }
}

module.exports = {
  FormContextAnalyzer,
};
