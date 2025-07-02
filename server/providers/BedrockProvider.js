/**
 * AWS Bedrock Provider Implementation
 * Handles AWS Bedrock API calls - PLATFORM SPECIFIC ONLY
 * Model-specific logic is handled by model tools
 */

const {
  BedrockRuntimeClient,
  InvokeModelCommand,
} = require("@aws-sdk/client-bedrock-runtime");
const BaseProvider = require("./BaseProvider");
const { ModelFactory } = require("../models");

class BedrockProvider extends BaseProvider {
  constructor() {
    super({
      name: "AWS Bedrock",
      defaultModel:
        process.env.BEDROCK_MODEL ||
        process.env.DEFAULT_BEDROCK_MODEL ||
        "apac.anthropic.claude-sonnet-4-20250514-v1:0",
      description: "AWS Bedrock with Claude models",
      requiresApiKey: true,
      timeout: parseInt(process.env.CLOUD_LLM_TIMEOUT) || 120000,
      maxTokens: parseInt(process.env.MAX_TOKENS) || 4000,
    });

    this.region = process.env.AWS_REGION || "ap-southeast-1";
    this.client = null;

    // Model ID mappings for friendlier names (platform-specific)
    this.modelMappings = {
      "claude-4-sonnet": "apac.anthropic.claude-sonnet-4-20250514-v1:0",
      "claude-3-sonnet": "anthropic.claude-3-sonnet-20240229-v1:0",
      "claude-3-haiku": "anthropic.claude-3-haiku-20240307-v1:0",
      "claude-3-opus": "anthropic.claude-3-opus-20240229-v1:0",
      "claude-3.5-sonnet": "anthropic.claude-3-5-sonnet-20241022-v2:0",
    };

    // Cost mapping for different models (platform-specific)
    this.pricingMap = {
      "claude-4-sonnet": { input: 0.003, output: 0.015 }, // per 1K tokens (estimated)
      "claude-3-haiku": { input: 0.00025, output: 0.00125 },
      "claude-3-sonnet": { input: 0.003, output: 0.015 },
      "claude-3-opus": { input: 0.015, output: 0.075 },
    };
  }

  async initialize() {
    const requiredEnvVars = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"];
    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );

    if (missingVars.length > 0) {
      throw new Error(
        `AWS credentials not found. Set ${missingVars.join(", ")}.`
      );
    }

    try {
      this.client = new BedrockRuntimeClient({
        region: this.region,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          ...(process.env.AWS_SESSION_TOKEN && {
            sessionToken: process.env.AWS_SESSION_TOKEN,
          }),
        },
      });

      console.log(
        `[${this.name}] Initialized in region: ${this.region} with model: ${this.defaultModel}`
      );
      return true;
    } catch (error) {
      throw new Error(`AWS Bedrock initialization failed: ${error.message}`);
    }
  }

  async isAvailable() {
    return !!(
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    );
  }

  async call({
    prompt,
    system = "",
    temperature = 0.3,
    model = null,
    taskType = "general",
  }) {
    const params = this._validateParams({ prompt, system, temperature, model });

    if (!this.client) {
      await this.initialize();
    }

    // Resolve model ID from friendly name (platform-specific)
    const modelId = this._resolveModelId(params.model);

    // Create model-specific tool instance
    const modelTool = ModelFactory.createModel(modelId, {
      baseTimeout: this.timeout,
      maxTokens: this.maxTokens,
    });

    console.log(
      `Calling ${this.name} API with model: ${modelId} (timeout: ${
        this.timeout / 1000
      }s)`
    );

    try {
      // Use model tool for optimization (model-specific)
      const optimizedSystem = modelTool.optimizeSystemPrompt(
        params.system,
        taskType
      );
      const optimizedPrompt = modelTool.optimizeUserPrompt(
        params.prompt,
        taskType
      );
      const modelParams = modelTool.getRequestParams(params, taskType);

      // Platform-specific request body for Bedrock
      const requestBody = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: modelParams.max_tokens || this.maxTokens,
        temperature: modelParams.temperature,
        messages: [{ role: "user", content: optimizedPrompt }],
        top_p: modelParams.top_p || 0.9,
        top_k: modelParams.top_k || 250,
        stop_sequences: modelParams.stop_sequences || [],
      };

      // Add system prompt if provided
      if (optimizedSystem) {
        requestBody.system = optimizedSystem;
      }

      // Handle inference profiles (platform-specific for Claude 4)
      if (modelId.includes("claude-sonnet-4")) {
        console.log(`[${this.name}] Using inference profile for ${modelId}`);
      }

      const command = new InvokeModelCommand({
        modelId: modelId,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(requestBody),
      });

      const response = await this.client.send(command);
      return this._parseBedrockResponse(response, modelId, modelTool, taskType);
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Parse Bedrock-specific response format (platform-specific)
   */
  _parseBedrockResponse(response, modelId, modelTool, taskType) {
    if (!response.body) {
      throw new Error("Empty response from Bedrock");
    }

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // Debug: log the actual response structure
    console.log(`[${this.name}] Response structure:`, {
      keys: Object.keys(responseBody),
      contentType: typeof responseBody.content,
      hasContent: !!responseBody.content,
      contentLength: responseBody.content?.length || 0,
      firstContentItem: responseBody.content?.[0]
        ? Object.keys(responseBody.content[0])
        : [],
    });

    // Handle different response formats (platform-specific)
    let content = null;

    // Format 1: Standard Claude format with content array
    if (
      responseBody.content &&
      Array.isArray(responseBody.content) &&
      responseBody.content[0]?.text
    ) {
      content = responseBody.content[0].text;
    }
    // Format 2: Direct text response
    else if (responseBody.text) {
      content = responseBody.text;
    }
    // Format 3: Completion format
    else if (responseBody.completion) {
      content = responseBody.completion;
    }
    // Format 4: Message format
    else if (responseBody.message?.content) {
      content = responseBody.message.content;
    }

    if (!content) {
      console.error(
        `[${this.name}] No text content found in response:`,
        JSON.stringify(responseBody, null, 2)
      );
      throw new Error("No text content in Bedrock response");
    }

    const cleanContent = content.trim();

    // Use model tool for response parsing (model-specific)
    const finalContent = modelTool.parseResponse(cleanContent, taskType);

    // Platform-specific response analysis
    const responseInfo = {
      content: finalContent,
      usage: responseBody.usage || {},
      model: modelId,
      stopReason: responseBody.stop_reason,
    };

    // Log platform-specific metrics
    if (responseInfo.usage.input_tokens) {
      const totalTokens =
        responseInfo.usage.input_tokens + responseInfo.usage.output_tokens;
      console.log(
        `[${this.name}] Tokens used: ${totalTokens} (input: ${responseInfo.usage.input_tokens}, output: ${responseInfo.usage.output_tokens})`
      );

      // Estimate cost (platform-specific)
      const estimatedCost = this._estimateCost(responseInfo.usage, modelId);
      if (estimatedCost > 0) {
        console.log(
          `[${this.name}] Estimated cost: $${estimatedCost.toFixed(6)}`
        );
      }
    }

    return finalContent;
  }

  /**
   * Resolve model ID from friendly name (platform-specific)
   */
  _resolveModelId(modelName) {
    return this.modelMappings[modelName] || modelName;
  }

  /**
   * Estimate cost based on usage (platform-specific)
   */
  _estimateCost(usage, modelId) {
    let modelType = "claude-3-haiku"; // default
    if (modelId.includes("sonnet-4")) modelType = "claude-4-sonnet";
    else if (modelId.includes("sonnet")) modelType = "claude-3-sonnet";
    else if (modelId.includes("opus")) modelType = "claude-3-opus";

    const pricing = this.pricingMap[modelType];
    if (!pricing) return 0;

    const inputCost = (usage.input_tokens / 1000) * pricing.input;
    const outputCost = (usage.output_tokens / 1000) * pricing.output;

    return inputCost + outputCost;
  }

  /**
   * Platform-specific error handling
   */
  _handleError(error) {
    if (error.name === "ValidationException") {
      throw new Error(`AWS Bedrock validation error: ${error.message}`);
    }

    if (error.name === "ThrottlingException") {
      throw new Error(
        `AWS Bedrock throttling: ${error.message}. Try again later.`
      );
    }

    if (error.name === "AccessDeniedException") {
      throw new Error(
        `AWS Bedrock access denied: ${error.message}. Check your IAM permissions.`
      );
    }

    if (error.name === "ResourceNotFoundException") {
      throw new Error(
        `AWS Bedrock model not found: ${error.message}. Check model availability in your region.`
      );
    }

    // Fall back to base error handling
    super._handleError(error);
  }

  /**
   * Health check for Bedrock Provider
   */
  async healthCheck() {
    try {
      const testResponse = await this.call({
        prompt: 'Respond with just "OK" to confirm connection.',
        system: "You are testing the connection. Respond briefly.",
        temperature: 0.1,
        taskType: "health_check",
      });

      return testResponse.toLowerCase().includes("ok");
    } catch (error) {
      console.warn(`[${this.name}] Health check failed:`, error.message);
      return false;
    }
  }
}

module.exports = BedrockProvider;
