/**
 * Provider Factory and Manager
 * Central coordinator for all LLM providers with fallback management
 */

const GroqProvider = require("./GroqProvider");
const OpenAIProvider = require("./OpenAIProvider");
const AnthropicProvider = require("./AnthropicProvider");
const OllamaProvider = require("./OllamaProvider");
const BedrockProvider = require("./BedrockProvider");

class ProviderManager {
  constructor() {
    this.providers = new Map();
    this.currentProvider = null;
    this.fallbackOrder = ["ollama"]; // Default fallback order
    this.initialized = false;
  }

  /**
   * Initialize all available providers
   */
  async initialize() {
    console.log("[ProviderManager] Initializing LLM providers...");

    // Create provider instances
    const providerClasses = {
      groq: GroqProvider,
      openai: OpenAIProvider,
      anthropic: AnthropicProvider,
      ollama: OllamaProvider,
      bedrock: BedrockProvider,
    };

    // Initialize each provider
    for (const [name, ProviderClass] of Object.entries(providerClasses)) {
      try {
        const provider = new ProviderClass();
        const isAvailable = await provider.isAvailable();

        if (isAvailable) {
          await provider.initialize();
          this.providers.set(name, provider);
          console.log(`[ProviderManager] ✅ ${provider.name} initialized`);
        } else {
          console.log(`[ProviderManager] ⚠️  ${provider.name} - not available`);
        }
      } catch (error) {
        console.log(
          `[ProviderManager] ❌ ${name} initialization failed: ${error.message}`
        );
      }
    }

    // Set primary provider
    const primaryProvider = process.env.LLM_PROVIDER || "groq";
    await this.setCurrentProvider(primaryProvider);

    this.initialized = true;
    this._logStatus();
  }

  /**
   * Set current provider with fallback logic
   */
  async setCurrentProvider(providerName) {
    if (this.providers.has(providerName)) {
      this.currentProvider = providerName;
      console.log(
        `[ProviderManager] 🎯 Current provider: ${
          this.providers.get(providerName).name
        }`
      );
    } else {
      // Find first available provider
      const available = Array.from(this.providers.keys());
      if (available.length > 0) {
        this.currentProvider = available[0];
        console.log(
          `[ProviderManager] 🔄 Using available provider: ${
            this.providers.get(this.currentProvider).name
          }`
        );
      } else {
        this.currentProvider = "ollama"; // Always fallback to Ollama
        console.log(
          `[ProviderManager] 📦 No providers available, will attempt Ollama fallback`
        );
      }
    }
  }

  /**
   * Universal LLM call with automatic fallback
   */
  async call({
    prompt,
    system = "",
    temperature = 0.3,
    model = null,
    provider = null,
  }) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      throw new Error("Invalid prompt: must be a non-empty string");
    }

    const targetProvider = provider || this.currentProvider;

    console.log(`[ProviderManager] Using provider: ${targetProvider}`);

    // Try primary provider
    if (this.providers.has(targetProvider)) {
      try {
        return await this.providers.get(targetProvider).call({
          prompt,
          system,
          temperature,
          model,
        });
      } catch (error) {
        console.error(
          `[ProviderManager] ${targetProvider} failed: ${error.message}`
        );

        // Attempt fallback
        return await this._attemptFallback(
          { prompt, system, temperature, model },
          targetProvider,
          error
        );
      }
    } else {
      throw new Error(
        `Provider '${targetProvider}' not available. Available: ${Array.from(
          this.providers.keys()
        ).join(", ")}`
      );
    }
  }

  /**
   * Attempt fallback to other providers
   */
  async _attemptFallback(
    { prompt, system, temperature, model },
    failedProvider,
    originalError
  ) {
    console.log(`[ProviderManager] 🔄 Attempting fallback...`);

    // Create fallback order (prioritize Ollama, then others)
    const fallbackProviders = [
      "ollama",
      ...Array.from(this.providers.keys()),
    ].filter((provider) => provider !== failedProvider);

    for (const fallbackProvider of fallbackProviders) {
      if (this.providers.has(fallbackProvider)) {
        console.log(`[ProviderManager] 🔄 Trying ${fallbackProvider}...`);

        try {
          return await this.providers.get(fallbackProvider).call({
            prompt,
            system,
            temperature,
            model,
          });
        } catch (fallbackError) {
          console.warn(
            `[ProviderManager] ${fallbackProvider} also failed: ${fallbackError.message}`
          );
          continue;
        }
      }
    }

    // If Ollama is not initialized but available, try to set it up
    if (!this.providers.has("ollama")) {
      console.log(`[ProviderManager] 📦 Attempting Ollama setup...`);
      await this._setupOllamaFallback();

      if (this.providers.has("ollama")) {
        try {
          return await this.providers.get("ollama").call({
            prompt,
            system,
            temperature,
            model,
          });
        } catch (ollamaError) {
          console.warn(
            `[ProviderManager] Ollama setup failed: ${ollamaError.message}`
          );
        }
      }
    }

    // All providers failed
    const availableProviders = Array.from(this.providers.keys());
    throw new Error(
      `All LLM providers failed. Primary error: ${originalError.message}. ` +
        `Available providers: ${availableProviders.join(", ")}. ` +
        `Please check your API keys and configuration.`
    );
  }

  /**
   * Setup Ollama as emergency fallback
   */
  async _setupOllamaFallback() {
    try {
      console.log("[ProviderManager] Setting up Ollama fallback...");
      const ollama = new OllamaProvider();

      if (await ollama.isAvailable()) {
        await ollama.initialize();
        this.providers.set("ollama", ollama);
        console.log("[ProviderManager] ✅ Ollama fallback ready");
      } else {
        console.log("[ProviderManager] ⚠️  Ollama not available for fallback");
        this._showOllamaSetupInstructions();
      }
    } catch (error) {
      console.warn(
        `[ProviderManager] Ollama fallback setup failed: ${error.message}`
      );
    }
  }

  /**
   * Show Ollama setup instructions
   */
  _showOllamaSetupInstructions() {
    const requiredModel = process.env.OLLAMA_MODEL || "qwen3:8b";

    console.log("\n" + "=".repeat(60));
    console.log("🤖 OLLAMA SETUP RECOMMENDED");
    console.log("=".repeat(60));
    console.log("For reliable fallback, install Ollama:");
    console.log("");
    console.log("📋 Quick setup:");
    console.log("   1. Install: https://ollama.com/download");
    console.log(`   2. Pull model: ollama pull ${requiredModel}`);
    console.log("   3. Start: ollama serve");
    console.log("");
    console.log("💡 System will continue with available cloud providers.");
    console.log("=".repeat(60));
    console.log("");
  }

  /**
   * Test a specific provider
   */
  async testProvider(providerName) {
    if (!this.providers.has(providerName)) {
      throw new Error(`Provider ${providerName} not available`);
    }

    return await this.providers.get(providerName).test();
  }

  /**
   * Get specific provider by name
   */
  getProvider(providerName) {
    return this.providers.get(providerName) || null;
  }

  /**
   * Get list of available provider names
   */
  getAvailableProviders() {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if manager is initialized
   */
  get isInitialized() {
    return this.initialized;
  }

  /**
   * Get current provider info
   */
  getCurrentProvider() {
    if (!this.currentProvider || !this.providers.has(this.currentProvider)) {
      return null;
    }

    return {
      name: this.currentProvider,
      ...this.providers.get(this.currentProvider).getInfo(),
    };
  }

  /**
   * Switch to different provider
   */
  async switchProvider(providerName) {
    if (!this.providers.has(providerName)) {
      throw new Error(
        `Provider ${providerName} not available. Available: ${Array.from(
          this.providers.keys()
        ).join(", ")}`
      );
    }

    this.currentProvider = providerName;
    console.log(
      `[ProviderManager] Switched to: ${this.providers.get(providerName).name}`
    );
  }

  /**
   * Log current status
   */
  _logStatus() {
    const available = Array.from(this.providers.keys());
    const current = this.getCurrentProvider();

    console.log(
      `[ProviderManager] Available providers: [${available.join(", ")}]`
    );
    console.log(
      `[ProviderManager] Current: ${current?.name || "None"} | Model: ${
        current?.defaultModel || "None"
      }`
    );
  }

  /**
   * Check provider health
   */
  async healthCheck() {
    const results = {};

    for (const [name, provider] of this.providers) {
      try {
        const result = await provider.test();
        results[name] = result;
      } catch (error) {
        results[name] = { success: false, error: error.message };
      }
    }

    return results;
  }
}

// Create singleton instance
const providerManager = new ProviderManager();

module.exports = {
  ProviderManager,
  providerManager,

  // Export individual providers for direct use if needed
  GroqProvider,
  OpenAIProvider,
  AnthropicProvider,
  OllamaProvider,
  BedrockProvider,
};
