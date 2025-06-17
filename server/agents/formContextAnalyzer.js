// FormContextAnalyzer.js - Reads HTML + JS + CSS

const fs = require("fs");
const path = require("path");
const callOllamaLLM = require("../utils/llmOllama");
const { ConfigHelper, DEFAULT_OPTIONS } = require("./config/prompts");

class FormContextAnalyzer {
  constructor(options = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
      enableSelfReflection: true,
    };
    this.progressCallback = options.progressCallback || (() => {});
  }

  async analyze(htmlPath, description = "", acceptanceCriteria = "") {
    try {
      this.progressCallback("🔍 Form Analyzer\nInitializing analysis...", {
        analyzing: htmlPath,
        description: description.substring(0, 100),
        criteria: acceptanceCriteria.substring(0, 100),
      });

      // Step 1: Extract form structure using original method
      const formStructure = await this._extractFormStructure(htmlPath);

      // Step 2: Extract additional assets for context
      const additionalAssets = await this._extractAdditionalAssets(htmlPath);

      // Step 3: Generate intelligent test analysis
      const intelligentResult = await this._generateIntelligentAnalysis(
        formStructure,
        description,
        acceptanceCriteria
      );

      // Step 4: Quality assurance
      const optimizedResult = await this._performMandatorySelfReflection(
        intelligentResult,
        formStructure,
        description,
        acceptanceCriteria
      );

      this.progressCallback("✅ Form Analyzer\nAnalysis completed", {
        preview: `Analyzed HTML + JS + CSS with ${
          Object.keys(optimizedResult.fields || {}).length
        } fields and ${
          (optimizedResult.recommendedTestScenarios || []).length
        } scenarios`,
      });

      return optimizedResult;
    } catch (error) {
      this.progressCallback("❌ Form Analyzer\nAnalysis failed", {
        error: error.message,
      });
      console.error("Form analysis failed:", error);
      throw new Error(`Form analysis failed: ${error.message}`);
    }
  }

  // Extract form structure using original method
  async _extractFormStructure(htmlPath) {
    this.progressCallback("🔍 Form Analyzer\nExtracting form structure...", {
      status: "Reading HTML file and identifying form elements...",
    });

    const htmlContent = fs.readFileSync(htmlPath, "utf8");

    // Debug HTML analysis
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
      throw new Error("FORM_STRUCTURE_ANALYZER agent not found");
    }

    // Pass HTML content in format expected by agent
    const prompt = ConfigHelper.buildPrompt(
      "FORM_STRUCTURE_ANALYZER",
      { content: htmlContent } // Wrap in object with .content property
    );

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

      console.log(
        "📥 Raw LLM response (first 500 chars):",
        result.substring(0, 500)
      );
      console.log(
        "📥 Raw LLM response (last 200 chars):",
        result.substring(Math.max(0, result.length - 200))
      );

      const parsedResult = this._parseAndValidateJSON(result, "form structure");

      console.log("✅ Structure validation:");
      console.log("- Form fields count:", parsedResult.formFields?.length || 0);
      console.log(
        "- Has clientSideValidation:",
        !!parsedResult.clientSideValidation
      );
      console.log(
        "- Error messages found:",
        Object.keys(parsedResult.clientSideValidation?.errorMessages || {})
      );

      // Log field details
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

  // Extract additional assets for context
  async _extractAdditionalAssets(htmlPath) {
    const htmlContent = fs.readFileSync(htmlPath, "utf8");
    const htmlDir = path.dirname(htmlPath);

    // Extract inline JavaScript
    const inlineJS = this._extractInlineJavaScript(htmlContent);

    // Extract external JavaScript files
    const externalJS = await this._extractExternalJavaScript(
      htmlContent,
      htmlDir
    );

    // Extract inline CSS
    const inlineCSS = this._extractInlineCSS(htmlContent);

    // Extract external CSS files
    const externalCSS = await this._extractExternalCSS(htmlContent, htmlDir);

    const assets = {
      javascript: {
        inline: inlineJS,
        external: externalJS,
        combined: [...inlineJS, ...externalJS].join("\n\n"),
      },
      css: {
        inline: inlineCSS,
        external: externalCSS,
        combined: [...inlineCSS, ...externalCSS].join("\n\n"),
      },
    };

    // Log asset analysis
    console.log("📝 HTML + JS + CSS Analysis:");
    console.log("- HTML length:", htmlContent.length);
    console.log("- Inline JS blocks:", inlineJS.length);
    console.log("- External JS files:", externalJS.length);
    console.log("- Inline CSS blocks:", inlineCSS.length);
    console.log("- External CSS files:", externalCSS.length);
    console.log(
      "- Contains form validation:",
      assets.javascript.combined.includes("validation") ||
        assets.javascript.combined.includes("error") ||
        assets.javascript.combined.includes("required")
    );
    console.log(
      "- Contains error messages:",
      assets.javascript.combined.includes("error") ||
        assets.javascript.combined.includes("message")
    );

    return assets;
  }

  // Extract inline JavaScript
  _extractInlineJavaScript(htmlContent) {
    const jsBlocks = [];
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let match;

    while ((match = scriptRegex.exec(htmlContent)) !== null) {
      const scriptContent = match[1].trim();
      if (scriptContent && !match[0].includes("src=")) {
        jsBlocks.push(scriptContent);
      }
    }

    return jsBlocks;
  }

  // Extract external JavaScript files
  async _extractExternalJavaScript(htmlContent, htmlDir) {
    const jsFiles = [];
    const scriptSrcRegex = /<script[^>]+src=['"](.*?)['"][^>]*>/gi;
    let match;

    while ((match = scriptSrcRegex.exec(htmlContent)) !== null) {
      const srcPath = match[1];

      if (!srcPath.startsWith("http") && !srcPath.startsWith("//")) {
        try {
          const fullPath = path.resolve(htmlDir, srcPath);
          if (fs.existsSync(fullPath)) {
            const jsContent = fs.readFileSync(fullPath, "utf8");
            jsFiles.push(jsContent);
            console.log(
              `📄 Loaded external JS: ${srcPath} (${jsContent.length} chars)`
            );
          }
        } catch (error) {
          console.warn(`⚠️ Could not load JS file: ${srcPath}`, error.message);
        }
      }
    }

    return jsFiles;
  }

  // Extract inline CSS
  _extractInlineCSS(htmlContent) {
    const cssBlocks = [];
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let match;

    while ((match = styleRegex.exec(htmlContent)) !== null) {
      const styleContent = match[1].trim();
      if (styleContent) {
        cssBlocks.push(styleContent);
      }
    }

    return cssBlocks;
  }

  // Extract external CSS files
  async _extractExternalCSS(htmlContent, htmlDir) {
    const cssFiles = [];
    const linkRegex =
      /<link[^>]+href=['"](.*?)['"][^>]*rel=['"]*stylesheet['"]*/gi;
    let match;

    while ((match = linkRegex.exec(htmlContent)) !== null) {
      const hrefPath = match[1];

      if (!hrefPath.startsWith("http") && !hrefPath.startsWith("//")) {
        try {
          const fullPath = path.resolve(htmlDir, hrefPath);
          if (fs.existsSync(fullPath)) {
            const cssContent = fs.readFileSync(fullPath, "utf8");
            cssFiles.push(cssContent);
            console.log(
              `📄 Loaded external CSS: ${hrefPath} (${cssContent.length} chars)`
            );
          }
        } catch (error) {
          console.warn(
            `⚠️ Could not load CSS file: ${hrefPath}`,
            error.message
          );
        }
      }
    }

    return cssFiles;
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
          "Creating test strategies based on form structure and requirements...",
      }
    );

    if (!ConfigHelper.hasAgent("INTELLIGENT_TEST_GENERATOR")) {
      throw new Error("INTELLIGENT_TEST_GENERATOR agent not found");
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

      this.progressCallback("✅ Form Analyzer\nTest scenarios generated", {
        preview: `Generated ${
          Object.keys(parsedResult.fields || {}).length
        } field strategies - proceeding to quality validation...`,
      });

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
    this.progressCallback("🔄 Form Analyzer\nPerforming quality assurance...", {
      status: "Validating test accuracy against form behavior and criteria...",
    });

    if (!ConfigHelper.hasAgent("FORM_QUALITY_AUDITOR")) {
      throw new Error("FORM_QUALITY_AUDITOR agent not found");
    }

    const prompt = ConfigHelper.buildPrompt(
      "FORM_QUALITY_AUDITOR",
      intelligentResult,
      originalFormStructure,
      description,
      acceptanceCriteria
    );

    try {
      const optimizedResult = await callOllamaLLM({
        prompt,
        system: ConfigHelper.getSystemPrompt("FORM_QUALITY_AUDITOR"),
        temperature: ConfigHelper.getTemperature("FORM_QUALITY_AUDITOR"),
      });

      const parsedResult = this._parseAndValidateJSON(
        optimizedResult,
        "quality-assured analysis"
      );

      this._validateQualityImprovements(intelligentResult, parsedResult);

      this.progressCallback("✅ Form Analyzer\nQuality assurance completed", {
        preview: `Validated ${
          Object.keys(parsedResult.fields || {}).length
        } fields with ${
          (parsedResult.recommendedTestScenarios || []).length
        } scenarios`,
      });

      return parsedResult;
    } catch (error) {
      throw new Error(`Quality assurance failed: ${error.message}`);
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

  // JSON parser with error handling
  _parseAndValidateJSON(jsonString, context) {
    try {
      console.log(`🔍 Attempting to parse ${context} JSON...`);
      console.log(`📝 Raw response length: ${jsonString.length}`);

      // Remove markdown blocks
      let cleaned = jsonString
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      // Remove comments
      cleaned = cleaned
        .replace(/\/\/.*$/gm, "")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/,(\s*[}\]])/g, "$1")
        .replace(/\n\s*\n/g, "\n")
        .trim();

      console.log(`📝 Cleaned JSON length: ${cleaned.length}`);
      console.log(
        `📝 Cleaned JSON (first 200 chars): ${cleaned.substring(0, 200)}`
      );
      console.log(
        `📝 Cleaned JSON (last 200 chars): ${cleaned.substring(
          Math.max(0, cleaned.length - 200)
        )}`
      );

      // Check if JSON looks complete
      if (!cleaned.startsWith("{") || !cleaned.endsWith("}")) {
        console.error("❌ JSON does not start with { or end with }");
        console.error("First 10 chars:", cleaned.substring(0, 10));
        console.error("Last 10 chars:", cleaned.substring(cleaned.length - 10));

        // Try to find the JSON part
        const startIndex = cleaned.indexOf("{");
        const lastBraceIndex = cleaned.lastIndexOf("}");

        if (
          startIndex !== -1 &&
          lastBraceIndex !== -1 &&
          lastBraceIndex > startIndex
        ) {
          cleaned = cleaned.substring(startIndex, lastBraceIndex + 1);
          console.log(
            "🔧 Extracted JSON substring, new length:",
            cleaned.length
          );
        } else {
          throw new Error("No valid JSON structure found in response");
        }
      }

      // Parse JSON
      const parsed = JSON.parse(cleaned);

      // Validate
      if (!parsed || typeof parsed !== "object") {
        throw new Error(`Invalid JSON structure for ${context}`);
      }

      console.log(
        `✅ Successfully parsed ${context} JSON with ${
          Object.keys(parsed).length
        } top-level properties`
      );
      console.log(`📋 Top-level keys: ${Object.keys(parsed).join(", ")}`);

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

      // Return fallback structure
      console.log("🔧 Returning fallback structure due to parsing failure");
      return {
        formFields: [],
        formElement: {
          selector: "form",
          method: "POST",
          hasPreventDefault: false,
        },
        clientSideValidation: { errorMessages: {}, successMessages: {} },
      };
    }
  }

  // Utility methods
  static getAvailableAgents() {
    return ConfigHelper.getAgentsByCategory("analysis");
  }

  static hasMandatoryQualityAssurance() {
    return ConfigHelper.hasAgent("FORM_QUALITY_AUDITOR");
  }

  static debugConfiguration() {
    console.log("=== FormContextAnalyzer Debug Info ===");
    console.log("Available agents:", ConfigHelper.debugAgentConfig());
    console.log(
      "Quality assurance available:",
      ConfigHelper.hasAgent("FORM_QUALITY_AUDITOR")
    );

    const requiredAgents = [
      "FORM_STRUCTURE_ANALYZER",
      "INTELLIGENT_TEST_GENERATOR",
      "FORM_QUALITY_AUDITOR",
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
        agentName === "FORM_QUALITY_AUDITOR" ? "MANDATORY" : "REQUIRED";
      console.log(
        `  - ${agentName}: available=${available}, hasBuildPrompt=${hasPrompt}, hasSystemPrompt=${hasSystemPrompt} [${status}]`
      );
    });
  }
}

module.exports = {
  FormContextAnalyzer,
};
