const callOllamaLLM = require("../utils/llmOllama");

async function testGenerator(testPlan) {
  const system =
    "You are a Playwright E2E test generator. Write Playwright tests in JavaScript. Cover all test scenarios, including assertions and error validation. Output ONLY code.";
  const prompt = `Write Playwright E2E tests for the following scenarios:\n${testPlan}\n\nOutput ONLY code.`;
  return await callOllamaLLM({ prompt, system });
}

module.exports = testGenerator;
