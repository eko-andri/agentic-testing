/**
 * Ollama Provider Implementation
 * Handles local Ollama server calls with model-specific optimizations
 */

const axios = require("axios");
const BaseProvider = require("./BaseProvider");

class OllamaProvider extends BaseProvider {
  constructor() {
    super({
      name: "Ollama Local",
      defaultModel: process.env.OLLAMA_MODEL || "qwen3:8b",
      description: "Local Ollama server (reliable fallback)",
      requiresApiKey: false,
      timeout: parseInt(process.env.OLLAMA_TIMEOUT) || 180000, // 3 minutes default
      maxTokens: parseInt(process.env.MAX_TOKENS) || 4000,
    });

    this.baseUrl = process.env.OLLAMA_URL || "http://localhost:11434";
    this.largeModelTimeout =
      parseInt(process.env.OLLAMA_LARGE_TIMEOUT) || 600000; // 10 minutes
  }

  async initialize() {
    console.log(`[${this.name}] Checking connection to ${this.baseUrl}`);

    try {
      // Check if Ollama server is running
      await axios.get(`${this.baseUrl}/api/tags`, { timeout: 5000 });
      console.log(
        `[${this.name}] Initialized with model: ${this.defaultModel}`
      );
      return true;
    } catch (error) {
      console.warn(`[${this.name}] Server not accessible: ${error.message}`);
      return false;
    }
  }

  async isAvailable() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async call({ prompt, system = "", temperature = 0.3, model = null }) {
    const params = this._validateParams({ prompt, system, temperature, model });

    // Optimize prompts for code generation
    const optimized = this._optimizeForCodeGeneration(
      params.prompt,
      params.system
    );

    // Determine timeout based on model size
    const currentTimeout = this._getTimeoutForModel(params.model);

    console.log(
      `Calling ${this.name} API with model: ${params.model} (timeout: ${
        currentTimeout / 1000
      }s)`
    );

    try {
      const requestBody = {
        model: params.model,
        prompt: optimized.system
          ? `${optimized.system}\n\n${optimized.prompt}`
          : optimized.prompt,
        stream: false,
        options: {
          temperature: params.temperature,
          num_predict: this.maxTokens,
          // Memory optimization based on model size
          num_ctx: this._getContextSizeForModel(params.model),
        },
      };

      const response = await axios.post(
        `${this.baseUrl}/api/generate`,
        requestBody,
        {
          timeout: currentTimeout,
          headers: { "Content-Type": "application/json" },
        }
      );

      return this._parseOllamaResponse(response.data, params.model);
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Parse Ollama-specific response format
   */
  _parseOllamaResponse(data, model) {
    if (!data?.response) {
      throw new Error("Invalid response from Ollama API");
    }

    const content = data.response.trim();

    // Ollama-specific response analysis
    const responseInfo = {
      content,
      model: data.model || model,
      evalCount: data.eval_count,
      evalDuration: data.eval_duration,
      loadDuration: data.load_duration,
      promptEvalCount: data.prompt_eval_count,
      promptEvalDuration: data.prompt_eval_duration,
      totalDuration: data.total_duration,
    };

    // Log Ollama-specific performance metrics
    if (responseInfo.totalDuration) {
      const totalSeconds = (responseInfo.totalDuration / 1000000000).toFixed(2);
      const tokensPerSecond = responseInfo.evalCount
        ? (
            responseInfo.evalCount /
            (responseInfo.evalDuration / 1000000000)
          ).toFixed(2)
        : "N/A";

      console.log(
        `[${this.name}] Performance: ${totalSeconds}s total, ${tokensPerSecond} tokens/sec`
      );
    }

    // Detect model-specific patterns
    if (model.includes("qwen") && content.includes("<think>")) {
      console.log(`[${this.name}] Qwen model showing reasoning patterns`);
    }

    if (model.includes("codellama") || model.includes("coder")) {
      console.log(`[${this.name}] Code-focused model detected`);
    }

    return this._parseResponse(content);
  }

  /**
   * Get appropriate timeout for model size
   */
  _getTimeoutForModel(model) {
    if (
      model.includes("30b") ||
      model.includes("32b") ||
      model.includes("70b")
    ) {
      return this.largeModelTimeout;
    }
    return this.timeout;
  }

  /**
   * Get appropriate context size for model
   */
  _getContextSizeForModel(model) {
    if (model.includes("30b") || model.includes("70b")) {
      return 2048; // Smaller context for large models to preserve memory
    }
    return 4096; // Standard context size
  }

  /**
   * Ollama-specific error handling
   */
  _handleError(error) {
    if (error.code === "ECONNREFUSED") {
      throw new Error(
        `Cannot connect to Ollama server at ${this.baseUrl}. ` +
          `Please ensure Ollama is running: ollama serve`
      );
    }

    if (error.response?.status === 404) {
      throw new Error(
        `Model not found in Ollama. ` +
          `Available models can be listed with: ollama list`
      );
    }

    if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
      throw new Error(
        `Ollama timeout after ${this.timeout / 1000}s. ` +
          `Consider using a smaller model or increasing timeout.`
      );
    }

    // Fall back to base error handling
    super._handleError(error);
  }

  /**
   * Check model availability and auto-install if needed
   */
  async checkModel(modelName) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5000,
      });

      if (!response.data?.models) {
        return { available: false, reason: "Invalid response from Ollama" };
      }

      const hasModel = response.data.models.some(
        (model) =>
          model.name === modelName ||
          model.name.startsWith(modelName.split(":")[0])
      );

      if (!hasModel) {
        return {
          available: false,
          reason: `Model ${modelName} not found`,
          installedModels: response.data.models.map((m) => m.name),
        };
      }

      return { available: true, models: response.data.models };
    } catch (error) {
      return { available: false, reason: error.message };
    }
  }

  /**
   * Auto-install model if missing
   */
  async installModel(modelName) {
    try {
      console.log(`[${this.name}] Installing model: ${modelName}`);

      const response = await axios.post(
        `${this.baseUrl}/api/pull`,
        {
          name: modelName,
          stream: false,
        },
        { timeout: 300000 }
      ); // 5 minutes timeout

      console.log(`[${this.name}] Model ${modelName} installed successfully`);
      return true;
    } catch (error) {
      console.warn(
        `[${this.name}] Failed to install model ${modelName}:`,
        error.message
      );
      return false;
    }
  }

  /**
   * Optimize prompts for code generation tasks
   * Remove narratives for direct code output
   */
  _optimizeForCodeGeneration(prompt, system) {
    // Detect if this is a code generation task
    const isCodeGeneration =
      prompt.toLowerCase().includes("generate") &&
      (prompt.includes("test") ||
        prompt.includes("code") ||
        prompt.includes("playwright") ||
        prompt.includes("typescript"));

    if (!isCodeGeneration) {
      return { prompt, system }; // No optimization for non-code tasks
    }

    // Enhanced system prompt for code generation
    const codeGenSystemPrefix = `You are a TypeScript code generator. CRITICAL RULES:
1. NEVER start with explanations like "I'll create" or "Here's"
2. IMMEDIATELY start with code (import statement or class definition)
3. NO markdown code blocks (no \`\`\`)
4. NO narrative text outside of code comments
5. Generate ONLY executable code
6. Use modern best practices

START YOUR RESPONSE WITH CODE:
`;

    const optimizedSystem = codeGenSystemPrefix + (system || "");

    // Add format requirements to user prompt
    const codeGenPromptSuffix = `

OUTPUT FORMAT:
- Start immediately with code
- No explanations before code
- Direct executable output
- Complete and runnable

Generate the code now:`;

    const optimizedPrompt = prompt + codeGenPromptSuffix;

    return { prompt: optimizedPrompt, system: optimizedSystem };
  }

  /**
   * Health check for Ollama Provider
   */
  async healthCheck() {
    try {
      const testResponse = await this.call({
        prompt: 'Respond with just "OK" to confirm connection.',
        system: "You are testing the connection. Respond briefly.",
        temperature: 0.1,
      });

      return testResponse.toLowerCase().includes("ok");
    } catch (error) {
      console.warn(`[${this.name}] Health check failed:`, error.message);
      return false;
    }
  }
}

module.exports = OllamaProvider;
