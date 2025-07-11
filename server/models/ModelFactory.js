/**
 * Model Factory
 * Creates appropriate model instances based on model ID
 * Centralizes model detection and instantiation logic
 */

const Claude4Model = require("./claude/Claude4Model");
const QwenModel = require("./qwen/QwenModel");
const GPTModel = require("./gpt/GPTModel");
const BaseModel = require("./BaseModel");

class ModelFactory {
  /**
   * Create model instance based on model ID
   * @param {string} modelId - The model identifier
   * @param {Object} options - Model configuration options
   * @returns {BaseModel} - Appropriate model instance
   */
  static createModel(modelId, options = {}) {
    if (!modelId) {
      throw new Error("Model ID is required");
    }

    const normalizedModelId = modelId.toLowerCase();

    // Claude models (any platform)
    if (this.isClaude4(normalizedModelId)) {
      return new Claude4Model(modelId, options);
    }

    // Qwen models (any platform)
    if (this.isQwen(normalizedModelId)) {
      return new QwenModel(modelId, options);
    }

    // GPT models (any platform)
    if (this.isGPT(normalizedModelId)) {
      return new GPTModel(modelId, options);
    }

    // Default fallback - use base model
    console.warn(
      `[ModelFactory] Unknown model type for ${modelId}, using BaseModel`
    );
    return new BaseModel(modelId, options);
  }

  /**
   * Detect if model is Claude 4
   */
  static isClaude4(modelId) {
    const claude4Patterns = [
      "claude-4",
      "claude-sonnet-4",
      "claude.4",
      "sonnet-4",
      "anthropic.claude-4",
      "apac.anthropic.claude-sonnet-4",
    ];

    return claude4Patterns.some((pattern) => modelId.includes(pattern));
  }

  /**
   * Detect if model is Claude (other versions)
   */
  static isClaude(modelId) {
    const claudePatterns = [
      "claude-3",
      "claude-2",
      "anthropic.claude",
      "haiku",
      "sonnet",
      "opus",
    ];

    return claudePatterns.some((pattern) => modelId.includes(pattern));
  }

  /**
   * Detect if model is Qwen
   */
  static isQwen(modelId) {
    const qwenPatterns = ["qwen", "qw"];

    return qwenPatterns.some((pattern) => modelId.includes(pattern));
  }

  /**
   * Detect if model is GPT
   */
  static isGPT(modelId) {
    const gptPatterns = ["gpt-", "gpt4", "gpt3"];

    return gptPatterns.some((pattern) => modelId.includes(pattern));
  }

  /**
   * Get supported model types
   */
  static getSupportedModels() {
    return {
      claude4: {
        patterns: ["claude-4", "claude-sonnet-4", "sonnet-4"],
        class: "Claude4Model",
        capabilities: [
          "test_generation",
          "form_analysis",
          "test_improvement",
          "code_verification",
        ],
      },
      qwen: {
        patterns: ["qwen", "qw"],
        class: "QwenModel",
        capabilities: [
          "test_generation",
          "form_analysis",
          "test_improvement",
          "code_verification",
        ],
      },
      gpt: {
        patterns: ["gpt-", "gpt4", "gpt3"],
        class: "GPTModel",
        capabilities: [
          "test_generation",
          "form_analysis",
          "test_improvement",
          "code_verification",
        ],
      },
    };
  }

  /**
   * Get model recommendations for task type
   * @param {string} taskType - Type of task
   * @returns {Array} - Recommended model types in order of preference
   */
  static getRecommendedModels(taskType) {
    const recommendations = {
      test_generation: ["claude4", "gpt", "qwen"],
      form_analysis: ["gpt", "claude4", "qwen"],
      test_improvement: ["claude4", "gpt", "qwen"],
      code_verification: ["gpt", "claude4", "qwen"],
    };

    return recommendations[taskType] || ["claude4", "gpt", "qwen"];
  }
}

module.exports = ModelFactory;
