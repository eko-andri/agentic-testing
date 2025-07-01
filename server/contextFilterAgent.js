/**
 * Context Filter Agent
 * Intelligent agent that filters form fields based on business context
 * Uses LLM to determine which fields are relevant to specific requirements
 */

const { callLLM } = require("./utils");

class ContextFilterAgent {
  constructor(config = {}) {
    this.config = {
      provider: config.provider || "ollama",
      model: config.model || "qwen3:30b",
      temperature: config.temperature || 0.2,
      ...config,
    };
  }

  /**
   * Filter form fields based on description and acceptance criteria
   * @param {Array} allFields - All detected form fields
   * @param {string} description - Business description
   * @param {string} acceptanceCriteria - Acceptance criteria
   * @returns {Promise<Array>} - Filtered relevant fields
   */
  async filterRelevantFields(allFields, description, acceptanceCriteria) {
    if (!description && !acceptanceCriteria) {
      console.log(
        "[ContextFilterAgent] No context provided, returning all fields"
      );
      return allFields;
    }

    if (!allFields || allFields.length === 0) {
      console.log("[ContextFilterAgent] No fields to filter");
      return [];
    }

    try {
      console.log(
        `[ContextFilterAgent] Filtering ${allFields.length} fields based on context...`
      );

      const prompt = this._buildFilteringPrompt(
        allFields,
        description,
        acceptanceCriteria
      );

      const response = await callLLM({
        prompt,
        system: this._getSystemPrompt(),
        model: this.config.model,
        temperature: this.config.temperature,
        provider: this.config.provider,
      });

      const result = this._parseFilteringResponse(response, allFields);

      console.log(
        `[ContextFilterAgent] Filtered to ${result.relevantFields.length} relevant fields`
      );
      console.log(`[ContextFilterAgent] Reasoning: ${result.reasoning}`);

      return result.relevantFields;
    } catch (error) {
      console.error(
        "[ContextFilterAgent] Filtering failed, returning all fields:",
        error.message
      );
      return allFields;
    }
  }

  /**
   * Build the filtering prompt for LLM
   */
  _buildFilteringPrompt(allFields, description, acceptanceCriteria) {
    const fieldsInfo = allFields.map((field) => ({
      name: field.name || field.id,
      type: field.type,
      required: field.required,
      id: field.id,
    }));

    return `Analyze the following business context and determine which form fields are RELEVANT to the requirements:

BUSINESS CONTEXT:
Description: ${description}
Acceptance Criteria: ${acceptanceCriteria}

AVAILABLE FORM FIELDS:
${JSON.stringify(fieldsInfo, null, 2)}

INSTRUCTIONS:
1. Analyze the business context carefully
2. Determine which fields are directly related to the requirements
3. If the context mentions specific validation rules (e.g., "minimum age 16"), include related fields
4. If the context mentions specific field types (e.g., "email validation"), include those fields
5. Do NOT include fields that are not mentioned or implied in the context

Return your analysis in this JSON format:
{
  "relevantFields": ["field1", "field2"],
  "reasoning": "Explanation of why these fields were selected",
  "excluded": ["field3", "field4"],
  "excludeReason": "Explanation of why other fields were excluded"
}

Example:
If context mentions "date of birth minimum 16 years", only include DOB-related fields.
If context mentions "email validation", only include email-related fields.
If context mentions "all form validation", include all fields.`;
  }

  /**
   * System prompt for the filtering agent
   */
  _getSystemPrompt() {
    return `You are a Form Context Analysis Agent. Your job is to intelligently determine which form fields are relevant to specific business requirements.

Key principles:
1. Be conservative - only include fields explicitly mentioned or strongly implied
2. Consider validation requirements (age, format, etc.)
3. Consider business logic connections
4. Always provide clear reasoning
5. Return valid JSON only

Focus on RELEVANCE to the specific requirements, not just technical completeness.`;
  }

  /**
   * Parse the LLM response and extract relevant fields
   */
  _parseFilteringResponse(response, allFields) {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const analysis = JSON.parse(jsonMatch[0]);

      // Validate response structure
      if (!analysis.relevantFields || !Array.isArray(analysis.relevantFields)) {
        throw new Error("Invalid response structure");
      }

      // Map field names back to actual field objects
      const relevantFields = allFields.filter((field) => {
        const fieldName = field.name || field.id;
        return analysis.relevantFields.includes(fieldName);
      });

      return {
        relevantFields,
        reasoning: analysis.reasoning || "No reasoning provided",
        excluded: analysis.excluded || [],
        excludeReason: analysis.excludeReason || "No exclude reason provided",
      };
    } catch (error) {
      console.error(
        "[ContextFilterAgent] Failed to parse response:",
        error.message
      );

      // Fallback: try to infer from simple keyword matching
      return this._fallbackFiltering(allFields, response);
    }
  }

  /**
   * Fallback filtering using simple keyword matching
   */
  _fallbackFiltering(allFields, response) {
    console.log("[ContextFilterAgent] Using fallback keyword matching...");

    const responseText = response.toLowerCase();
    const relevantFields = allFields.filter((field) => {
      const fieldName = (field.name || field.id || "").toLowerCase();
      return responseText.includes(fieldName);
    });

    return {
      relevantFields: relevantFields.length > 0 ? relevantFields : allFields,
      reasoning: "Fallback keyword matching applied",
      excluded: [],
      excludeReason: "Fallback mode - no exclusions",
    };
  }

  /**
   * Get filtering statistics for logging/debugging
   */
  getFilteringStats(originalFields, filteredFields) {
    const originalCount = originalFields.length;
    const filteredCount = filteredFields.length;
    const reductionPercentage =
      originalCount > 0
        ? (((originalCount - filteredCount) / originalCount) * 100).toFixed(1)
        : 0;

    return {
      original: originalCount,
      filtered: filteredCount,
      reduction: `${reductionPercentage}%`,
      efficiency:
        filteredCount < originalCount ? "Optimized" : "No filtering applied",
    };
  }
}

module.exports = { ContextFilterAgent };
