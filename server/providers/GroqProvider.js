/**
 * Groq Provider Implementation
 * Handles Groq Cloud API calls with specific response parsing
 */

const axios = require("axios");
const BaseProvider = require("./BaseProvider");

class GroqProvider extends BaseProvider {
  constructor() {
    super({
      name: "Groq Cloud",
      defaultModel: process.env.GROQ_MODEL || "qwen3:30b",
      description: "Groq Cloud API with high-speed inference",
      requiresApiKey: true,
      timeout: parseInt(process.env.CLOUD_LLM_TIMEOUT) || 120000,
      maxTokens: parseInt(process.env.MAX_TOKENS) || 4000,
    });

    this.apiUrl = "https://api.groq.com/openai/v1/chat/completions";
    this.apiKey = process.env.GROQ_API_KEY;
  }

  async initialize() {
    if (!this.apiKey) {
      throw new Error("GROQ_API_KEY not found in environment");
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
      throw new Error("Groq API key not configured");
    }

    console.log(
      `Calling ${this.name} API with model: ${params.model} (timeout: ${
        this.timeout / 1000
      }s)`
    );

    try {
      // Optimize prompts for code generation
      const optimized = this._optimizeForCodeGeneration(
        params.prompt,
        params.system
      );

      const messages = [];
      if (optimized.system) {
        messages.push({ role: "system", content: optimized.system });
      }
      messages.push({ role: "user", content: optimized.prompt });

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

      return this._parseGroqResponse(response.data);
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Parse Groq-specific response format
   */
  _parseGroqResponse(data) {
    if (!data) {
      throw new Error("Invalid response from Groq API");
    }

    // Groq follows OpenAI format
    if (!data.choices?.[0]?.message?.content) {
      throw new Error("No message content in Groq response");
    }

    const content = data.choices[0].message.content.trim();

    // Groq-specific response analysis
    const responseInfo = {
      content,
      usage: data.usage || {},
      model: data.model || "unknown",
      finishReason: data.choices[0].finish_reason,
    };

    // Log Groq-specific metrics
    if (responseInfo.usage.total_tokens) {
      console.log(
        `[${this.name}] Tokens used: ${responseInfo.usage.total_tokens} (prompt: ${responseInfo.usage.prompt_tokens}, completion: ${responseInfo.usage.completion_tokens})`
      );
    }

    return this._parseResponse(content);
  }

  /**
   * Groq-specific error handling
   */
  _handleError(error) {
    // Groq-specific error messages
    if (error.response?.data?.error) {
      const groqError = error.response.data.error;

      if (groqError.code === "rate_limit_exceeded") {
        throw new Error(`Groq rate limit exceeded: ${groqError.message}`);
      }

      if (groqError.code === "invalid_api_key") {
        throw new Error(
          "Invalid Groq API key. Please check your GROQ_API_KEY."
        );
      }

      if (groqError.code === "model_not_found") {
        throw new Error(
          `Groq model '${groqError.model}' not found. Available models: qwen3:30b, llama3-8b-8192, etc.`
        );
      }

      throw new Error(`Groq API error: ${groqError.message}`);
    }

    // Fall back to base error handling
    super._handleError(error);
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
   * Health check for Groq Provider
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

module.exports = GroqProvider;
