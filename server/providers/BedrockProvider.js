/**
 * AWS Bedrock Provider Implementation
 * Handles AWS Bedrock API calls with Claude models
 * Optimized specifically for Claude 4 with direct code output
 */

const {
  BedrockRuntimeClient,
  InvokeModelCommand,
} = require("@aws-sdk/client-bedrock-runtime");
const BaseProvider = require("./BaseProvider");

class BedrockProvider extends BaseProvider {
  constructor() {
    super({
      name: "AWS Bedrock",
      defaultModel:
        process.env.BEDROCK_MODEL ||
        "apac.anthropic.claude-sonnet-4-20250514-v1:0",
      description: "AWS Bedrock managed Claude models",
      requiresApiKey: false, // Uses AWS credentials
      timeout: parseInt(process.env.CLOUD_LLM_TIMEOUT) || 120000,
      maxTokens: parseInt(process.env.MAX_TOKENS) || 4000,
    });

    this.region = process.env.AWS_REGION || "ap-southeast-1";
    this.client = null;

    // Model mapping for easier reference
    this.modelMap = {
      "claude-4-sonnet": "apac.anthropic.claude-sonnet-4-20250514-v1:0",
      "claude-3-sonnet": "anthropic.claude-3-sonnet-20240229-v1:0",
      "claude-3-haiku": "anthropic.claude-3-haiku-20240307-v1:0",
      "claude-3-opus": "anthropic.claude-3-opus-20240229-v1:0",
      "claude-3.5-sonnet": "anthropic.claude-3-5-sonnet-20241022-v2:0",
    };

    // Inference profile mapping for APAC region
    this.profileMap = {
      "apac.anthropic.claude-sonnet-4-20250514-v1:0":
        "arn:aws:bedrock:ap-southeast-1:518870435381:inference-profile/apac.anthropic.claude-sonnet-4-20250514-v1:0",
    };
  }

  async initialize() {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error(
        "AWS credentials not found. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY."
      );
    }

    try {
      const config = { region: this.region };

      config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN,
      };

      this.client = new BedrockRuntimeClient(config);

      console.log(
        `[${this.name}] Initialized in region: ${this.region} with model: ${this.defaultModel}`
      );
      return true;
    } catch (error) {
      console.error(`[${this.name}] Initialization failed:`, error.message);
      throw error;
    }
  }

  async isAvailable() {
    return !!(
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    );
  }

  async call({ prompt, system = "", temperature = 0.3, model = null }) {
    const params = this._validateParams({ prompt, system, temperature, model });

    if (!this.client) {
      await this.initialize();
    }

    // Resolve model ID from friendly name
    const modelId = this._resolveModelId(params.model);

    console.log(
      `Calling ${this.name} API with model: ${modelId} (timeout: ${
        this.timeout / 1000
      }s)`
    );

    try {
      // Claude 4 specific optimizations
      const optimizedSystem = this._optimizeSystemPromptForClaude4(
        params.system,
        modelId
      );
      const optimizedPrompt = this._optimizeUserPromptForClaude4(
        params.prompt,
        modelId
      );

      const requestBody = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: this.maxTokens,
        temperature: params.temperature,
        messages: [{ role: "user", content: optimizedPrompt }],
        top_p: 0.9,
        top_k: 250,
        stop_sequences: ["```", "\n\n---", "## "], // Stop at various narrative markers
      };

      // Add optimized system prompt if provided (as top-level property)
      if (optimizedSystem) {
        requestBody.system = optimizedSystem;
      }

      // Build command with inference profile if available
      const commandParams = {
        modelId: modelId,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(requestBody),
      };

      // Add inference profile for models that require it
      const profileArn = this.profileMap[modelId];
      if (profileArn) {
        commandParams.inferenceConfig = {
          profileArn: profileArn,
        };
        console.log(`[${this.name}] Using inference profile for ${modelId}`);
      }

      const command = new InvokeModelCommand(commandParams);
      const response = await this.client.send(command);

      return this._parseBedrockResponse(response, modelId);
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Optimize system prompt specifically for Claude 4
   * Claude 4 tends to give narrative explanations, we want direct code output
   */
  _optimizeSystemPromptForClaude4(systemPrompt, modelId) {
    if (!modelId.includes("claude-sonnet-4")) {
      return systemPrompt; // Only optimize for Claude 4
    }

    const claude4SystemPrefix = `You are a Playwright TypeScript code generator. 
  
  CRITICAL INSTRUCTIONS:
  - Generate ONLY working TypeScript code
  - NO explanations, NO narratives, NO comments outside code
  - Start immediately with import statements
  - End with complete test functions
  - Use modern Playwright patterns (page.locator, expect)
  - Include proper TypeScript types (Page, Locator)
  
  `;

    return claude4SystemPrefix + (systemPrompt || "");
  }

  /**
   * Optimize user prompt specifically for Claude 4
   * Add specific instructions to avoid narrative responses
   */
  _optimizeUserPromptForClaude4(userPrompt, modelId) {
    if (!modelId.includes("claude-sonnet-4")) {
      return userPrompt; // Only optimize for Claude 4
    }

    const claude4PromptSuffix = `
  
  OUTPUT FORMAT REQUIREMENTS:
  - Start with: import { test, expect, Page } from '@playwright/test';
  - No explanations before code
  - No markdown formatting
  - Direct TypeScript code only
  - Complete and executable test file
  
  Generate the code now:`;

    return userPrompt + claude4PromptSuffix;
  }

  /**
   * Claude 4 specific response parsing
   * Removes narrative parts and extracts clean code
   */
  _parseClaude4Response(content, modelId) {
    if (!modelId.includes("claude-sonnet-4")) {
      return content; // Only optimize for Claude 4
    }

    // Remove common narrative patterns from Claude 4
    let cleanContent = content
      .replace(/^Here's.*?code.*?:\s*/i, "") // "Here's the code:"
      .replace(/^I'll.*?create.*?:\s*/i, "") // "I'll create..."
      .replace(/^Let me.*?generate.*?:\s*/i, "") // "Let me generate..."
      .replace(/^This.*?will.*?:\s*/i, "") // "This will..."
      .replace(/^The.*?test.*?:\s*/i, "") // "The test..."
      .replace(/```typescript\n?/g, "") // Remove markdown
      .replace(/```ts\n?/g, "") // Remove markdown
      .replace(/```javascript\n?/g, "") // Remove markdown
      .replace(/```js\n?/g, "") // Remove markdown
      .replace(/```\n?/g, "") // Remove markdown
      .trim();

    // If it starts with import, it's probably clean code
    if (cleanContent.startsWith("import")) {
      return cleanContent;
    }

    // Try to find the first import statement and extract from there
    const importMatch = cleanContent.match(/(import\s+.*[\s\S]*)/);
    if (importMatch) {
      return importMatch[1].trim();
    }

    // If no import found, look for test functions
    const testMatch = cleanContent.match(/(test\s*\(.*[\s\S]*)/);
    if (testMatch) {
      // Add minimal import if missing
      return `import { test, expect } from '@playwright/test';\n\n${testMatch[1].trim()}`;
    }

    // Return original if no patterns match
    return cleanContent;
  }

  /**
   * Parse Bedrock-specific response format
   */
  _parseBedrockResponse(response, modelId) {
    if (!response.body) {
      throw new Error("Empty response from Bedrock");
    }

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    if (!responseBody.content?.[0]?.text) {
      throw new Error("No text content in Bedrock response");
    }

    const content = responseBody.content[0].text.trim();

    // Apply Claude 4 specific parsing if needed
    const cleanContent = this._parseClaude4Response(content, modelId);

    // Bedrock-specific response analysis
    const responseInfo = {
      content: cleanContent,
      usage: responseBody.usage || {},
      model: modelId,
      stopReason: responseBody.stop_reason,
    };

    // Log Bedrock-specific metrics
    if (responseInfo.usage.input_tokens) {
      const totalTokens =
        responseInfo.usage.input_tokens + responseInfo.usage.output_tokens;
      console.log(
        `[${this.name}] Tokens used: ${totalTokens} (input: ${responseInfo.usage.input_tokens}, output: ${responseInfo.usage.output_tokens})`
      );

      // Estimate cost (rough approximation for Claude models)
      const estimatedCost = this._estimateCost(responseInfo.usage, modelId);
      if (estimatedCost > 0) {
        console.log(
          `[${this.name}] Estimated cost: $${estimatedCost.toFixed(6)}`
        );
      }
    }

    return this._parseResponse(cleanContent);
  }

  /**
   * Resolve model ID from friendly name or full ARN
   */
  _resolveModelId(model) {
    if (!model) return this.defaultModel;

    // If it's already a full ARN, return as-is
    if (
      model.includes("anthropic.claude") ||
      model.includes("apac.anthropic.claude")
    )
      return model;

    // Try to resolve from model map
    return this.modelMap[model.toLowerCase()] || this.defaultModel;
  }

  /**
   * Estimate cost based on token usage (rough approximation)
   */
  _estimateCost(usage, modelId) {
    if (!usage.input_tokens || !usage.output_tokens) return 0;

    // Rough pricing for Claude models (as of 2024/2025)
    const pricing = {
      "claude-4-sonnet": { input: 0.003, output: 0.015 }, // per 1K tokens (estimated)
      "claude-3-haiku": { input: 0.00025, output: 0.00125 },
      "claude-3-sonnet": { input: 0.003, output: 0.015 },
      "claude-3-opus": { input: 0.015, output: 0.075 },
    };

    let modelType = "claude-3-haiku"; // default
    if (modelId.includes("sonnet-4")) modelType = "claude-4-sonnet";
    else if (modelId.includes("sonnet")) modelType = "claude-3-sonnet";
    else if (modelId.includes("opus")) modelType = "claude-3-opus";

    const rates = pricing[modelType];
    const inputCost = (usage.input_tokens / 1000) * rates.input;
    const outputCost = (usage.output_tokens / 1000) * rates.output;

    return inputCost + outputCost;
  }

  /**
   * Bedrock-specific error handling
   */
  _handleError(error) {
    const errorMap = {
      ValidationException: `Bedrock validation error: ${error.message}`,
      ResourceNotFoundException: `Bedrock model not found: ${error.message}`,
      AccessDeniedException: `Bedrock access denied: Check AWS credentials and permissions`,
      ThrottlingException: `Bedrock throttled: ${error.message}`,
      ServiceQuotaExceededException: `Bedrock quota exceeded: ${error.message}`,
      ModelTimeoutException: `Bedrock model timeout: ${error.message}`,
      ModelNotReadyException: `Bedrock model not ready: ${error.message}`,
    };

    if (errorMap[error.name]) {
      throw new Error(errorMap[error.name]);
    }

    // Fall back to base error handling
    super._handleError(error);
  }

  /**
   * Get available Bedrock models
   */
  getAvailableModels() {
    return Object.values(this.modelMap);
  }

  /**
   * Get model mapping
   */
  getModelMap() {
    return this.modelMap;
  }

  /**
   * Get inference profile mapping
   */
  getProfileMap() {
    return this.profileMap;
  }
}

module.exports = BedrockProvider;
