/**
 * Anthropic Claude Provider Implementation
 * Handles Anthropic API calls with Claude-specific response parsing
 */

const axios = require("axios");
const BaseProvider = require("./BaseProvider");

class AnthropicProvider extends BaseProvider {
  constructor() {
    super({
      name: "Anthropic Claude",
      defaultModel: process.env.ANTHROPIC_MODEL || "claude-3-haiku-20240307",
      description: "Anthropic Claude models with advanced reasoning",
      requiresApiKey: true,
      timeout: parseInt(process.env.CLOUD_LLM_TIMEOUT) || 120000,
      maxTokens: parseInt(process.env.MAX_TOKENS) || 4000,
    });

    this.apiUrl = "https://api.anthropic.com/v1/messages";
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    this.version = "2023-06-01";
  }

  async initialize() {
    if (!this.apiKey) {
      throw new Error("ANTHROPIC_API_KEY not found in environment");
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
      throw new Error("Anthropic API key not configured");
    }

    console.log(
      `Calling ${this.name} API with model: ${params.model} (timeout: ${
        this.timeout / 1000
      }s)`
    );

    try {
      // Claude-specific request format
      const requestBody = {
        model: params.model,
        max_tokens: this.maxTokens,
        temperature: params.temperature,
        messages: [{ role: "user", content: params.prompt }],
      };

      // Add system prompt if provided
      if (params.system) {
        requestBody.system = params.system;
      }

      const headers = {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": this.version,
      };

      const response = await axios.post(this.apiUrl, requestBody, {
        timeout: this.timeout,
        headers: headers,
      });

      return this._parseClaudeResponse(response.data);
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Parse Claude-specific response format
   */
  _parseClaudeResponse(data) {
    if (!data) {
      throw new Error("Invalid response from Anthropic API");
    }

    // Claude response format
    if (!data.content?.[0]?.text) {
      throw new Error("No text content in Claude response");
    }

    const content = data.content[0].text.trim();

    // Claude-specific response analysis
    const responseInfo = {
      content,
      usage: data.usage || {},
      model: data.model || "unknown",
      stopReason: data.stop_reason,
      role: data.role,
    };

    // Log Claude-specific metrics
    if (responseInfo.usage.input_tokens) {
      console.log(
        `[${this.name}] Tokens used: ${
          responseInfo.usage.input_tokens + responseInfo.usage.output_tokens
        } (input: ${responseInfo.usage.input_tokens}, output: ${
          responseInfo.usage.output_tokens
        })`
      );
    }

    // Claude often has thinking patterns, let's detect them
    if (content.includes("<thinking>") || content.includes("<think>")) {
      console.log(
        `[${this.name}] Response contains thinking patterns (good reasoning)`
      );
    }

    return this._parseResponse(content);
  }

  /**
   * Claude-specific error handling
   */
  _handleError(error) {
    // Claude-specific error messages
    if (error.response?.data?.error) {
      const claudeError = error.response.data.error;

      if (claudeError.type === "rate_limit_error") {
        throw new Error(`Claude rate limit exceeded: ${claudeError.message}`);
      }

      if (claudeError.type === "authentication_error") {
        throw new Error(
          "Invalid Anthropic API key. Please check your ANTHROPIC_API_KEY."
        );
      }

      if (claudeError.type === "not_found_error") {
        throw new Error(
          `Claude model '${claudeError.message}' not found. Available models: claude-3-haiku-20240307, claude-3-sonnet-20240229, etc.`
        );
      }

      if (claudeError.type === "overloaded_error") {
        throw new Error(
          "Claude API is overloaded. Please retry in a few moments."
        );
      }

      throw new Error(`Claude API error: ${claudeError.message}`);
    }

    // Fall back to base error handling
    super._handleError(error);
  }

  /**
   * Get Claude-specific model options
   */
  getAvailableModels() {
    return [
      "claude-3-haiku-20240307",
      "claude-3-sonnet-20240229",
      "claude-3-opus-20240229",
      "claude-3-5-sonnet-20240620",
    ];
  }
}

module.exports = AnthropicProvider;
