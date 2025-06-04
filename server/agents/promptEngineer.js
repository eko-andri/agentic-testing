const callOllamaLLM = require("../utils/llmOllama");

async function promptEngineer(inputText) {
  const system =
    "You are a QA test planner. Given a user story or ticket description, extract all relevant E2E test requirements in clear bullet points, covering validation, edge case, and dependencies.";
  const prompt = `TICKET/USER STORY:\n${inputText}\n\nExtract all E2E test scenarios and requirements as bullet points.`;
  return await callOllamaLLM({ prompt: inputText });
  // return await callOllamaLLM({ prompt: inputText, system });
}

module.exports = promptEngineer;
