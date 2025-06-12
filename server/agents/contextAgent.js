const callOllamaLLM = require("../utils/llmOllama");
const { setCurrentProgress } = require("./utils/progressStatus");

async function contextAgent(description, acceptanceCriteria) {
  setCurrentProgress({
    status: "Context Agent:\nAnalyzing requirement completeness...",
    prompt: `Description: ${description}\nAcceptance Criteria: ${acceptanceCriteria}`,
  });

  const systemPrompt = `You are a Context Analysis Agent for E2E testing. Your job is to analyze user requirements and determine if they contain sufficient context for test generation.

Since form structure analysis will be handled by a specialized form analyzer, focus on:
1. Are the requirements clear and specific enough?
2. Are the acceptance criteria well-defined?
3. Is the business logic described adequately?

Respond ONLY in this exact format:
COMPLETE - if the requirements are clear and specific enough for test generation
MISSING - if requirements need more clarity or detail

Be lenient - if the core requirement is understandable, respond with COMPLETE. The form analyzer will handle technical details.`;

  const userPrompt = `Analyze this requirement for clarity and completeness:

Description: ${description}

Acceptance Criteria: ${acceptanceCriteria}

Check if this provides enough business context for E2E test generation.`;

  const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;

  try {
    const response = await callOllamaLLM({ prompt: combinedPrompt });
    const analysis = response.trim();

    if (analysis.startsWith("COMPLETE")) {
      setCurrentProgress({
        status:
          "Context Agent:\nRequirement analysis complete - sufficient business context provided.",
        prompt: "",
      });
      return {
        isComplete: true,
        message:
          "Requirement contains sufficient business context for test generation.",
        analysis: analysis,
      };
    } else if (analysis.startsWith("MISSING")) {
      const missingItems = analysis.substring(7).trim();
      setCurrentProgress({
        status: "Context Agent:\nRequirement incomplete - more clarity needed.",
        prompt: `Missing context:\n${missingItems}`,
      });
      return {
        isComplete: false,
        message: `Missing context:\n${missingItems}`,
        analysis: analysis,
        missingItems: missingItems,
      };
    } else {
      setCurrentProgress({
        status:
          "Context Agent:\nRequirement analysis complete - assuming sufficient context.",
        prompt: "Proceeding with available context.",
      });
      return {
        isComplete: true,
        message: "Proceeding with available context.",
        analysis: analysis,
      };
    }
  } catch (err) {
    setCurrentProgress({
      status: "Context Agent:\nError analyzing requirement context.",
      prompt: combinedPrompt,
    });
    console.error("[ERROR] contextAgent LLM:", err);
    throw err;
  }
}

module.exports = { contextAgent };
