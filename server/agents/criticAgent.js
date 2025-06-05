const callOllamaLLM = require("../utils/llmOllama");

async function criticAgent(testPlanText) {
  const system = `
You are a QA reviewer. Given a list of E2E test scenarios, identify if any important negative, edge, or error-handling cases are missing.
If the test plan is complete, respond with "✅ PASS".
If something is missing, list what should be added.
`;

  const prompt = `E2E TEST PLAN:

${testPlanText}

Do you notice any missing scenarios?`;

  const feedback = await callOllamaLLM({ prompt, system });
  return feedback.trim();
}

module.exports = criticAgent;
