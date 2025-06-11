const callOllamaLLM = require("../utils/llmOllama");
const { setCurrentProgress } = require("./utils/progressStatus");

function cleanCodeOutput(code) {
  return code
    .split("\n")
    .filter((line) => !line.trim().startsWith("```"))
    .join("\n");
}

async function testGenerator(testPlan) {
  // Get today's date dynamically
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  // Prompt agentic: agent must analyze the fields, selectors, and HTML form context independently
  const system = `You are a Playwright E2E test generator. Analyze the requirement and acceptance criteria provided. Identify the relevant form fields and selectors needed for the test. If necessary, create a minimal HTML form context that matches the requirement. Write Playwright tests in JavaScript. Output ONLY code. Do NOT include markdown, backticks, or explanation. If the scenario involves date or age validation, use today's date (${todayStr}) as the reference. If not, ignore the date context.`;
  const userPrompt = `Here are the requirements and acceptance criteria:\n${testPlan}\n\nYour tasks:\n1. Analyze the requirements above, determine the relevant fields and selectors for the form to be tested.\n2. If needed, create a simple HTML form context that matches the required fields.\n3. Generate Playwright E2E test code in JavaScript that tests the requirements.\n4. Output code only (no markdown/backticks/explanation).\n\nUse selectors and fields according to your own analysis.`;
  const combinedPrompt = `${system}\n\n${userPrompt}`;

  setCurrentProgress({
    status: "Test Generator Agent:\nGenerating Playwright code...",
    prompt: combinedPrompt,
  });

  let code;
  try {
    code = await callOllamaLLM({ prompt: combinedPrompt });
    setCurrentProgress({
      status: "Test Generator Agent:\nPlaywright code generated.",
      prompt: combinedPrompt,
      playwrightCode: code
    });
  } catch (err) {
    setCurrentProgress({
      status: "Test Generator Agent:\nError generating Playwright code.",
      prompt: combinedPrompt,
    });
    console.error("[ERROR] testGenerator LLM:", err);
    throw err;
  }
  code = cleanCodeOutput(code);
  return code;
}

function generateTestCode(testPlan, { ticketNumber, framework = "jest" }) {
  // Example: change testPlan into simple test code
  // (Real implementation: use LLM or template engine)
  return `
/**
 * Auto-generated test for Ticket: ${ticketNumber}
 */
describe('E2E Test for ${ticketNumber}', () => {
  it('should follow the scenario', () => {
    // ${testPlan.split("\n").join("\n    // ")}
  });
});
  `.trim();
}

module.exports = { testGenerator, generateTestCode };
