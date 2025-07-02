/**
 * GPT Model Tool
 * Handles GPT specific behavior across all platforms (OpenAI, Azure, etc.)
 */

const BaseModel = require("../BaseModel");

class GPTModel extends BaseModel {
  constructor(modelId, options = {}) {
    super(modelId, options);
    this.version = this.detectGPTVersion(modelId);
  }

  /**
   * Detect GPT version from model ID
   */
  detectGPTVersion(modelId) {
    if (modelId.includes("gpt-4o")) return "gpt-4o";
    if (modelId.includes("gpt-4")) return "gpt-4";
    if (modelId.includes("gpt-3.5")) return "gpt-3.5";
    return "gpt";
  }

  /**
   * GPT responds well to clear, structured prompts
   */
  optimizeSystemPrompt(systemPrompt, taskType) {
    if (taskType === "test_generation") {
      const gptSystemPrefix = `You are a senior test automation engineer specializing in Playwright and TypeScript.

Your task is to generate production-ready test code that follows best practices:
- Use modern Playwright API patterns
- Include proper error handling
- Write maintainable and readable code
- Follow TypeScript conventions

`;
      return gptSystemPrefix + (systemPrompt || "");
    }

    if (taskType === "form_analysis") {
      return `You are a web form analysis specialist. Extract and structure form field information into JSON format.
${systemPrompt || ""}`;
    }

    return systemPrompt || "";
  }

  /**
   * GPT works well with detailed requirements
   */
  optimizeUserPrompt(userPrompt, taskType) {
    if (taskType === "test_generation") {
      const gptPromptSuffix = `

Technical Requirements:
- Import: import { test, expect, Page } from '@playwright/test'
- Use page.locator() for element selection
- Include proper test structure with describe blocks
- Add beforeEach/afterEach hooks if needed
- Use async/await properly
- Include comprehensive assertions

Code Quality Requirements:
- Add TypeScript types where appropriate
- Use meaningful variable names  
- Include error handling for edge cases
- Follow Playwright best practices

Return only the complete TypeScript test code.`;

      return userPrompt + gptPromptSuffix;
    }

    if (taskType === "form_analysis") {
      return (
        userPrompt +
        `

Return a valid JSON object with the following structure:
{
  "fields": [
    {
      "name": "field_name",
      "type": "input_type",
      "required": boolean,
      "validation": "validation_rules"
    }
  ]
}`
      );
    }

    return userPrompt;
  }

  /**
   * GPT usually generates well-structured responses
   */
  parseResponse(rawResponse, taskType) {
    let cleanContent = rawResponse.trim();

    if (taskType === "test_generation") {
      // Remove markdown code blocks
      cleanContent = cleanContent
        .replace(/```typescript\n?/g, "")
        .replace(/```ts\n?/g, "")
        .replace(/```javascript\n?/g, "")
        .replace(/```js\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      // GPT usually generates clean code, minimal processing needed
      if (cleanContent.startsWith("import")) {
        return cleanContent;
      }

      // Look for import statements
      const importMatch = cleanContent.match(/(import\s+.*[\s\S]*)/);
      if (importMatch) {
        return importMatch[1].trim();
      }

      // Look for test blocks
      const testMatch = cleanContent.match(
        /(test\.describe.*[\s\S]*|describe.*[\s\S]*|test\s*\(.*[\s\S]*)/
      );
      if (testMatch) {
        return `import { test, expect } from '@playwright/test';\n\n${testMatch[1].trim()}`;
      }

      return cleanContent;
    }

    if (taskType === "form_analysis") {
      // Extract and validate JSON
      try {
        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          JSON.parse(jsonMatch[0]); // Validate
          return jsonMatch[0];
        }
      } catch (error) {
        console.warn(
          "[GPTModel] JSON parsing failed, returning original response"
        );
      }
    }

    return cleanContent;
  }

  /**
   * GPT specific request parameters
   */
  getRequestParams(baseParams, taskType) {
    const params = super.getRequestParams(baseParams, taskType);

    if (taskType === "test_generation") {
      return {
        ...params,
        temperature: 0.2, // Lower temperature for consistent code
        top_p: 0.8,
        frequency_penalty: 0.1, // Reduce repetition
        presence_penalty: 0.1,
      };
    }

    if (taskType === "form_analysis") {
      return {
        ...params,
        temperature: 0.1, // Very low for structured JSON output
        top_p: 0.7,
      };
    }

    return params;
  }

  /**
   * GPT capabilities vary by version
   */
  canHandleTask(taskType) {
    // GPT-4 and GPT-4o can handle all tasks
    if (this.version === "gpt-4" || this.version === "gpt-4o") {
      return true;
    }

    // GPT-3.5 might struggle with very complex code generation
    if (this.version === "gpt-3.5") {
      const complexTasks = ["test_improvement", "code_verification"];
      return !complexTasks.includes(taskType);
    }

    return true;
  }

  /**
   * GPT timeout based on version and task complexity
   */
  getTimeout(taskType) {
    const baseTimeout = this.options.baseTimeout || 120000; // 2 minutes default

    // GPT-4 is slower but more capable
    if (this.version === "gpt-4") {
      return baseTimeout * 1.5; // 3 minutes
    }

    // GPT-4o is faster
    if (this.version === "gpt-4o") {
      return baseTimeout; // 2 minutes
    }

    // GPT-3.5 is fastest
    return baseTimeout * 0.8; // 1.6 minutes
  }
}

module.exports = GPTModel;
