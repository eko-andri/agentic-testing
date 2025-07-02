/**
 * Base Model Class
 * Abstract class for model-specific processing
 * Each model has unique behavior for input processing, prompt optimization, and output parsing
 */

class BaseModel {
  constructor(modelId, options = {}) {
    this.modelId = modelId;
    this.options = options;
    this.name = this.constructor.name.replace("Model", "");
  }

  /**
   * Optimize system prompt for this specific model
   * @param {string} systemPrompt - Original system prompt
   * @param {string} taskType - Type of task (test_generation, form_analysis, etc.)
   * @returns {string} - Optimized system prompt
   */
  optimizeSystemPrompt(systemPrompt, taskType) {
    // Default implementation - override in subclasses
    return systemPrompt;
  }

  /**
   * Optimize user prompt for this specific model
   * @param {string} userPrompt - Original user prompt
   * @param {string} taskType - Type of task
   * @returns {string} - Optimized user prompt
   */
  optimizeUserPrompt(userPrompt, taskType) {
    // Default implementation - override in subclasses
    return userPrompt;
  }

  /**
   * Parse and clean response from this specific model
   * @param {string} rawResponse - Raw response from model
   * @param {string} taskType - Type of task
   * @returns {string} - Cleaned and parsed response
   */
  parseResponse(rawResponse, taskType) {
    // Default implementation - override in subclasses
    return rawResponse.trim();
  }

  /**
   * Get model-specific request parameters
   * @param {Object} baseParams - Base parameters
   * @param {string} taskType - Type of task
   * @returns {Object} - Model-specific parameters
   */
  getRequestParams(baseParams, taskType) {
    // Default implementation - override in subclasses
    return {
      temperature: baseParams.temperature || 0.3,
      max_tokens: baseParams.max_tokens || 4000,
      top_p: baseParams.top_p || 0.9,
      ...baseParams,
    };
  }

  /**
   * Check if this model can handle the task type
   * @param {string} taskType - Type of task
   * @returns {boolean} - Whether model can handle task
   */
  canHandleTask(taskType) {
    // Default implementation - most models can handle most tasks
    return true;
  }

  /**
   * Get model-specific timeout for task type
   * @param {string} taskType - Type of task
   * @returns {number} - Timeout in milliseconds
   */
  getTimeout(taskType) {
    const baseTimeout = this.options.baseTimeout || 120000;

    // Increase timeout for complex tasks
    const complexTasks = ["test_generation", "test_improvement"];
    if (complexTasks.includes(taskType)) {
      return baseTimeout * 1.5;
    }

    return baseTimeout;
  }
}

module.exports = BaseModel;
