const callOllamaLLM = require("../utils/llmOllama");
const { setCurrentProgress } = require("./utils/progressStatus");

async function criticAgent(testPlanText) {
  const system = `You are a QA reviewer. Given a list of E2E test scenarios, identify if any important negative, edge, or error-handling cases are missing.\nIf the test plan is complete, respond with \"✅ PASS\".\nIf something is missing, list what should be added.`;
  const userPrompt = `E2E TEST PLAN:\n\n${testPlanText}\n\nDo you notice any missing scenarios?`;
  const combinedPrompt = `${system}\n\n${userPrompt}`;

  setCurrentProgress({
    status: "Critic Agent:\nEvaluating E2E scenarios...",
    prompt: combinedPrompt,
  });
  try {
    const feedback = await callOllamaLLM({ prompt: combinedPrompt });
    setCurrentProgress({
      status: "Critic Agent:\nEvaluation finished.",
      prompt: combinedPrompt,
    });
    return feedback.trim();
  } catch (err) {
    setCurrentProgress({
      status: "Critic Agent:\nError evaluating scenarios.",
      prompt: combinedPrompt,
    });
    throw err;
  }
}

module.exports = criticAgent;
