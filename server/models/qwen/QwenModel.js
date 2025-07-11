/**
 * Qwen Model Tool
 * Handles Qwen specific behavior across all platforms (Ollama, Groq, etc.)
 */

const BaseModel = require("../BaseModel");

class QwenModel extends BaseModel {
  constructor(modelId, options = {}) {
    super(modelId, options);
    this.version = this.detectQwenVersion(modelId);
  }

  /**
   * Detect Qwen version from model ID
   */
  detectQwenVersion(modelId) {
    if (modelId.includes("qwen3")) return "qwen3";
    if (modelId.includes("qwen2.5")) return "qwen2.5";
    if (modelId.includes("qwen2")) return "qwen2";
    return "qwen";
  }

  /**
   * Qwen responds well to structured prompts
   * Optimize system prompt for clear instructions
   */
  optimizeSystemPrompt(systemPrompt, taskType) {
    if (taskType === "test_generation") {
      const qwenSystemPrefix = `You are an expert Playwright test generator specializing in TypeScript.

TASK: Generate complete, executable Playwright test code
FORMAT: TypeScript with proper imports and types
STYLE: Modern Playwright syntax (page.locator, expect)
OUTPUT: Code only, no explanations

`;
      return qwenSystemPrefix + (systemPrompt || "");
    }

    if (taskType === "form_analysis") {
      return `You are a web form analyzer. Analyze form fields and return structured JSON.
${systemPrompt || ""}`;
    }

    return systemPrompt || "";
  }

  /**
   * Qwen works well with clear, structured prompts
   */
  optimizeUserPrompt(userPrompt, taskType) {
    if (taskType === "test_generation") {
      const qwenPromptSuffix = `

REQUIREMENTS:
1. Use import { test, expect } from '@playwright/test'
2. Include proper test setup and cleanup
3. Use page.locator() for element selection
4. Include both positive and negative test cases
5. Add proper assertions with expect()
6. Generate complete, runnable code

OUTPUT: TypeScript code only`;

      return userPrompt + qwenPromptSuffix;
    }

    if (taskType === "form_analysis") {
      return (
        userPrompt +
        `

Output format: Valid JSON object with field information.`
      );
    }

    return userPrompt;
  }

  /**
   * Qwen usually generates clean responses
   * Minimal parsing needed
   */
  parseResponse(rawResponse, taskType) {
    let cleanContent = rawResponse.trim();

    if (taskType === "test_generation") {
      // Remove any explanatory text at the beginning
      cleanContent = cleanContent
        .replace(/^Here.*?is.*?:\s*/i, "")
        .replace(/^Below.*?is.*?:\s*/i, "")
        .replace(/```typescript\n?/g, "")
        .replace(/```ts\n?/g, "")
        .replace(/```javascript\n?/g, "")
        .replace(/```js\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      // If it starts with import, return as-is
      if (cleanContent.startsWith("import")) {
        return cleanContent;
      }

      // Look for import statements
      const importMatch = cleanContent.match(/(import\s+.*[\s\S]*)/);
      if (importMatch) {
        return importMatch[1].trim();
      }

      // Look for test blocks
      const testMatch = cleanContent.match(/(test\s*\(.*[\s\S]*)/);
      if (testMatch) {
        return `import { test, expect } from '@playwright/test';\n\n${testMatch[1].trim()}`;
      }

      return cleanContent;
    }

    if (taskType === "form_analysis") {
      // Try to extract and validate JSON
      try {
        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          JSON.parse(jsonMatch[0]); // Validate
          return jsonMatch[0];
        }
      } catch (error) {
        console.warn(
          "[QwenModel] JSON parsing failed, returning original response"
        );
      }
    }

    return cleanContent;
  }

  /**
   * Qwen specific request parameters
   */
  getRequestParams(baseParams, taskType) {
    const params = super.getRequestParams(baseParams, taskType);

    // Qwen works well with moderate creativity
    if (taskType === "test_generation") {
      return {
        ...params,
        temperature: 0.3, // Moderate creativity for code generation
        top_p: 0.8,
        repeat_penalty: 1.1, // Reduce repetition (Ollama/Groq specific)
      };
    }

    if (taskType === "form_analysis") {
      return {
        ...params,
        temperature: 0.2, // Lower for structured output
        top_p: 0.7,
      };
    }

    return params;
  }

  /**
   * Check Qwen capabilities based on version
   */
  canHandleTask(taskType) {
    // Qwen 3 and 2.5-coder are good for all tasks
    if (this.version === "qwen3" || this.version === "qwen2.5") {
      return true;
    }

    // Older versions might struggle with very complex tasks
    const complexTasks = ["test_improvement", "code_verification"];
    if (complexTasks.includes(taskType) && this.version === "qwen2") {
      return false;
    }

    return true;
  }

  /**
   * Qwen timeout varies by model size
   */
  getTimeout(taskType) {
    const baseTimeout = this.options.baseTimeout || 180000; // Default 3 minutes for Qwen

    // Larger models need more time
    if (this.modelId.includes("30b") || this.modelId.includes("14b")) {
      return baseTimeout * 2; // 6 minutes for large models
    }

    if (this.modelId.includes("7b") || this.modelId.includes("8b")) {
      return baseTimeout; // 3 minutes for medium models
    }

    return baseTimeout * 0.8; // Faster for small models
  }
}

module.exports = QwenModel;
