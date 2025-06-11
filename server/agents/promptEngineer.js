const callOllamaLLM = require("../utils/llmOllama");
const { setCurrentProgress } = require("./utils/progressStatus");

async function promptEngineer(
  description,
  extras = [],
  howToReproduce = "",
  acceptanceCriteria = ""
) {
  const extrasText = extras.length
    ? `Also include scenarios for: ${extras.join(", ")} if relevant.`
    : `Ignore performance, security, and accessibility unless explicitly mentioned.`;

  const howToReproduceText = howToReproduce
    ? `How to Reproduce:\n${howToReproduce}\n`
    : "";

  const criteriaText = acceptanceCriteria
    ? `Acceptance Criteria:\n${acceptanceCriteria}\n`
    : "";

  const includeNegativeCases = extras.includes("negative-case")
    ? "Also include at least one test scenario for negative/failure cases (e.g., missing files, invalid format, error state)."
    : "";

  const system = `You are a QA test planner. Given a user story, extract a maximum of 5 concise E2E test scenarios.\nUse bullet points and Given–When–Then format. Prioritize functional requirements.\n${includeNegativeCases}\n${extrasText}\n`;
  const userPrompt = `USER STORY:\n${description}\n\n${howToReproduceText}${criteriaText}\nGenerate E2E test scenarios accordingly.`;
  const combinedPrompt = `${system}\n\n${userPrompt}`;

  setCurrentProgress({
    status: "Prompt Engineer Agent:\nGenerating E2E scenarios...",
    prompt: combinedPrompt,
  });

  try {
    const result = await callOllamaLLM({ prompt: userPrompt, system });
    setCurrentProgress({
      status: "Prompt Engineer Agent:\nE2E scenarios generated.",
      prompt: combinedPrompt,
    });
    return result;
  } catch (err) {
    setCurrentProgress({
      status: "Prompt Engineer Agent:\nError generating E2E scenarios.",
      prompt: combinedPrompt,
    });
    throw err;
  }
}

module.exports = promptEngineer;
