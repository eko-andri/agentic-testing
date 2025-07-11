/**
 * OpenAI Provider Implementation
 * Handles OpenAI API calls with GPT model-specific optimizations
 */

const axios = require("axios");
const BaseProvider = require("./BaseProvider");

class OpenAIProvider extends BaseProvider {
  constructor() {
    super({
      name: "OpenAI",
      defaultModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
      description: "OpenAI GPT models with advanced capabilities",
      requiresApiKey: true,
      timeout: parseInt(process.env.CLOUD_LLM_TIMEOUT) || 120000,
      maxTokens: parseInt(process.env.MAX_TOKENS) || 4000,
    });

    this.apiUrl = "https://api.openai.com/v1/chat/completions";
    this.apiKey = process.env.OPENAI_API_KEY;
  }

  async initialize() {
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY not found in environment");
    }

    console.log(`[${this.name}] Initialized with model: ${this.defaultModel}`);
    return true;
  }

  async isAvailable() {
    return !!this.apiKey;
  }

  async call({ prompt, system = "", temperature = 0.3, model = null }) {
    const params = this._validateParams({ prompt, system, temperature, model });

    if (!this.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    console.log(
      `Calling ${this.name} API with model: ${params.model} (timeout: ${
        this.timeout / 1000
      }s)`
    );

    try {
      const messages = [];
      if (params.system) {
        messages.push({ role: "system", content: params.system });
      }
      messages.push({ role: "user", content: params.prompt });

      const requestBody = {
        model: params.model,
        messages: messages,
        temperature: params.temperature,
        max_tokens: this.maxTokens,
        stream: false,
      };

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      };

      const response = await axios.post(this.apiUrl, requestBody, {
        timeout: this.timeout,
        headers: headers,
      });

      return this._parseOpenAIResponse(response.data);
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Parse OpenAI-specific response format
   */
  _parseOpenAIResponse(data) {
    if (!data) {
      throw new Error("Invalid response from OpenAI API");
    }

    if (!data.choices?.[0]?.message?.content) {
      throw new Error("No message content in OpenAI response");
    }

    const content = data.choices[0].message.content.trim();

    // OpenAI-specific response analysis
    const responseInfo = {
      content,
      usage: data.usage || {},
      model: data.model || "unknown",
      finishReason: data.choices[0].finish_reason,
      created: data.created,
      id: data.id,
    };

    // Log OpenAI-specific metrics
    if (responseInfo.usage.total_tokens) {
      console.log(
        `[${this.name}] Tokens used: ${responseInfo.usage.total_tokens} (prompt: ${responseInfo.usage.prompt_tokens}, completion: ${responseInfo.usage.completion_tokens})`
      );

      // Estimate cost based on model
      const estimatedCost = this._estimateCost(
        responseInfo.usage,
        responseInfo.model
      );
      if (estimatedCost > 0) {
        console.log(
          `[${this.name}] Estimated cost: $${estimatedCost.toFixed(6)}`
        );
      }
    }

    // Analyze finish reason
    if (responseInfo.finishReason === "length") {
      console.log(
        `[${this.name}] Warning: Response may be truncated due to max_tokens limit`
      );
    }

    return this._parseResponse(content);
  }

  /**
   * Estimate cost based on token usage and model
   */
  _estimateCost(usage, model) {
    if (!usage.prompt_tokens || !usage.completion_tokens) return 0;

    // OpenAI pricing (as of 2024 - approximate)
    const pricing = {
      "gpt-4o": { input: 0.005, output: 0.015 }, // per 1K tokens
      "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
      "gpt-4-turbo": { input: 0.01, output: 0.03 },
      "gpt-4": { input: 0.03, output: 0.06 },
      "gpt-3.5-turbo": { input: 0.0015, output: 0.002 },
    };

    // Find matching pricing
    let modelPricing = pricing["gpt-4o-mini"]; // default
    for (const [modelName, price] of Object.entries(pricing)) {
      if (model.includes(modelName)) {
        modelPricing = price;
        break;
      }
    }

    const inputCost = (usage.prompt_tokens / 1000) * modelPricing.input;
    const outputCost = (usage.completion_tokens / 1000) * modelPricing.output;

    return inputCost + outputCost;
  }

  /**
   * OpenAI-specific error handling
   */
  _handleError(error) {
    // OpenAI-specific error messages
    if (error.response?.data?.error) {
      const openaiError = error.response.data.error;

      if (openaiError.code === "rate_limit_exceeded") {
        throw new Error(`OpenAI rate limit exceeded: ${openaiError.message}`);
      }

      if (openaiError.code === "invalid_api_key") {
        throw new Error(
          "Invalid OpenAI API key. Please check your OPENAI_API_KEY."
        );
      }

      if (openaiError.code === "model_not_found") {
        throw new Error(
          `OpenAI model '${openaiError.message}' not found. Available models: gpt-4o, gpt-4o-mini, gpt-3.5-turbo, etc.`
        );
      }

      if (openaiError.code === "insufficient_quota") {
        throw new Error(
          "OpenAI quota exceeded. Please check your billing and usage limits."
        );
      }

      if (openaiError.code === "context_length_exceeded") {
        throw new Error(
          "OpenAI context length exceeded. Try reducing your prompt or max_tokens."
        );
      }

      throw new Error(`OpenAI API error: ${openaiError.message}`);
    }

    // Fall back to base error handling
    super._handleError(error);
  }

  /**
   * Get available OpenAI models
   */
  getAvailableModels() {
    return ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"];
  }
}

module.exports = OpenAIProvider;
