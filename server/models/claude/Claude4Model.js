/**
 * Claude 4 Model Tool
 * Handles Claude 4 specific behavior across all platforms (Bedrock, Anthropic API, etc.)
 */

const BaseModel = require("../BaseModel");

class Claude4Model extends BaseModel {
  constructor(modelId, options = {}) {
    super(modelId, options);
    this.version = "claude-4";
  }

  /**
   * Claude 4 tends to give narrative explanations
   * Optimize system prompt to get direct code output
   */
  optimizeSystemPrompt(systemPrompt, taskType) {
    if (taskType === "test_generation") {
      const claude4SystemPrefix = `You are a Playwright TypeScript code generator. 

CRITICAL INSTRUCTIONS:
- Generate ONLY working TypeScript code
- NO explanations, NO narratives, NO comments outside code
- Start immediately with import statements
- End with complete test functions
- Use modern Playwright patterns (page.locator, expect)
- Include proper TypeScript types (Page, Locator)

`;
      return claude4SystemPrefix + (systemPrompt || "");
    }

    if (taskType === "form_analysis") {
      return `You are a web form analyzer. Return ONLY valid JSON with field information.
NO explanations, NO narratives.
${systemPrompt || ""}`;
    }

    return systemPrompt || "";
  }

  /**
   * Add specific instructions to avoid narrative responses
   */
  optimizeUserPrompt(userPrompt, taskType) {
    if (taskType === "test_generation") {
      const claude4PromptSuffix = `

OUTPUT FORMAT REQUIREMENTS:
- Start with: import { test, expect, Page } from '@playwright/test';
- No explanations before code
- No markdown formatting
- Direct TypeScript code only
- Complete and executable test file

Generate the code now:`;

      return userPrompt + claude4PromptSuffix;
    }

    if (taskType === "form_analysis") {
      return (
        userPrompt +
        `

Return ONLY valid JSON format. No explanations.`
      );
    }

    return userPrompt;
  }

  /**
   * Claude 4 specific response parsing
   * Removes narrative parts and extracts clean code
   */
  parseResponse(rawResponse, taskType) {
    let cleanContent = rawResponse.trim();

    if (taskType === "test_generation") {
      // Remove common narrative patterns from Claude 4
      cleanContent = cleanContent
        .replace(/^Here's.*?code.*?:\s*/i, "") // "Here's the code:"
        .replace(/^I'll.*?create.*?:\s*/i, "") // "I'll create..."
        .replace(/^Let me.*?generate.*?:\s*/i, "") // "Let me generate..."
        .replace(/^This.*?will.*?:\s*/i, "") // "This will..."
        .replace(/^The.*?test.*?:\s*/i, "") // "The test..."
        .replace(/```typescript\n?/g, "") // Remove markdown
        .replace(/```ts\n?/g, "") // Remove markdown
        .replace(/```javascript\n?/g, "") // Remove markdown
        .replace(/```js\n?/g, "") // Remove markdown
        .replace(/```\n?/g, "") // Remove markdown
        .trim();

      // If it starts with import, it's probably clean code
      if (cleanContent.startsWith("import")) {
        return cleanContent;
      }

      // Try to find the first import statement and extract from there
      const importMatch = cleanContent.match(/(import\s+.*[\s\S]*)/);
      if (importMatch) {
        return importMatch[1].trim();
      }

      // If no import found, look for test functions
      const testMatch = cleanContent.match(/(test\s*\(.*[\s\S]*)/);
      if (testMatch) {
        // Add minimal import if missing
        return `import { test, expect } from '@playwright/test';\n\n${testMatch[1].trim()}`;
      }

      // Return original if no patterns match
      return cleanContent;
    }

    if (taskType === "form_analysis") {
      // For JSON parsing, try to extract valid JSON
      try {
        // Try to find JSON in the response
        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          JSON.parse(jsonMatch[0]); // Validate JSON
          return jsonMatch[0];
        }
      } catch (error) {
        // If JSON parsing fails, return original
        console.warn(
          "[Claude4Model] JSON parsing failed, returning original response"
        );
      }
    }

    return cleanContent;
  }

  /**
   * Claude 4 specific request parameters
   */
  getRequestParams(baseParams, taskType) {
    const params = super.getRequestParams(baseParams, taskType);

    // Claude 4 specific optimizations
    if (taskType === "test_generation") {
      return {
        ...params,
        temperature: 0.1, // Lower temperature for more consistent code
        top_p: 0.9,
        top_k: 250,
        // Don't use '```' as stop sequence for code generation
        stop_sequences: ["\n\n---", "## ", "Human:", "Assistant:"],
      };
    }

    if (taskType === "form_analysis") {
      return {
        ...params,
        temperature: 0.2, // Low temperature for consistent JSON
        top_p: 0.8,
        stop_sequences: ["\n\n---", "Human:", "Assistant:"],
      };
    }

    return params;
  }

  /**
   * Claude 4 handles complex tasks very well
   */
  canHandleTask(taskType) {
    return true; // Claude 4 can handle all task types
  }

  /**
   * Claude 4 specific timeout - it's generally fast
   */
  getTimeout(taskType) {
    const baseTimeout = this.options.baseTimeout || 120000;

    // Claude 4 is usually fast, but increase for very complex tasks
    if (taskType === "test_generation") {
      return baseTimeout * 1.2; // 20% increase for complex generation
    }

    return baseTimeout;
  }
}

module.exports = Claude4Model;
