/**
 * Base Provider Class
 * Abstract class that defines the interface for all LLM providers
 */

class BaseProvider {
  constructor(config = {}) {
    this.name = config.name || "Unknown Provider";
    this.defaultModel = config.defaultModel || "default";
    this.description = config.description || "";
    this.requiresApiKey = config.requiresApiKey || false;
    this.timeout = config.timeout || 120000; // 2 minutes default
    this.maxTokens = config.maxTokens || 4000;
  }

  /**
   * Initialize the provider (check credentials, etc.)
   */
  async initialize() {
    throw new Error("initialize() must be implemented by subclass");
  }

  /**
   * Check if provider is available
   */
  async isAvailable() {
    throw new Error("isAvailable() must be implemented by subclass");
  }

  /**
   * Call the LLM provider
   */
  async call({ prompt, system = "", temperature = 0.3, model = null }) {
    throw new Error("call() must be implemented by subclass");
  }

  /**
   * Test the provider connection
   */
  async test() {
    try {
      const response = await this.call({
        prompt: 'Respond with just "OK" to confirm connection.',
        system: "You are testing the connection. Respond briefly.",
        temperature: 0.1,
      });

      return {
        success: true,
        provider: this.name,
        response: response.substring(0, 100),
        model: this.defaultModel,
      };
    } catch (error) {
      return {
        success: false,
        provider: this.name,
        error: error.message,
      };
    }
  }

  /**
   * Validate and normalize parameters
   */
  _validateParams({ prompt, system, temperature, model }) {
    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      throw new Error("Invalid prompt: must be a non-empty string");
    }

    return {
      prompt: prompt.trim(),
      system: system ? system.trim() : "",
      temperature: Math.max(0, Math.min(1, temperature || 0.3)),
      model: model || this.defaultModel,
    };
  }

  /**
   * Parse and validate response
   */
  _parseResponse(response, originalLength = 0) {
    if (!response || typeof response !== "string") {
      throw new Error("Invalid response from LLM provider");
    }

    const parsed = response.trim();

    // Log response info
    console.log(
      `✅ ${this.name} success: ${parsed.length} characters generated`
    );

    return parsed;
  }

  /**
   * Handle provider-specific errors
   */
  _handleError(error) {
    // Default error handling - can be overridden by subclasses
    if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
      throw new Error(`${this.name} API timeout after ${this.timeout / 1000}s`);
    }

    if (error.response?.status === 401) {
      throw new Error(`${this.name} API authentication failed. Check API key.`);
    }

    if (error.response?.status === 429) {
      throw new Error(
        `${this.name} API rate limit exceeded. Please wait and retry.`
      );
    }

    if (error.response?.status >= 500) {
      throw new Error(
        `${this.name} API server error: ${error.response.status}`
      );
    }

    throw new Error(`${this.name} API call failed: ${error.message}`);
  }

  /**
   * Get provider info
   */
  getInfo() {
    return {
      name: this.name,
      defaultModel: this.defaultModel,
      description: this.description,
      requiresApiKey: this.requiresApiKey,
      timeout: this.timeout,
      maxTokens: this.maxTokens,
    };
  }
}

module.exports = BaseProvider;
