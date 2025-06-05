const callOllamaLLM = require("../utils/llmOllama");

async function promptEngineer(
  description,
  extras = [],
  howToReproduce = "",
  acceptanceCriteria = ""
) {
  const extrasText = extras.length
    ? `Also include scenarios for: ${extras.join(", ")} if relevant.`
    : `Ignore performance, security, and accessibility unless explicitly mentioned.`;

  console.log("Prompt Engineer extras:", extrasText);

  const howToReproduceText = howToReproduce
    ? `How to Reproduce:
${howToReproduce}
`
    : "";

  const criteriaText = acceptanceCriteria
    ? `Acceptance Criteria:
${acceptanceCriteria}
`
    : "";

  const includeNegativeCases = extras.includes("negative-case")
    ? "Also include at least one test scenario for negative/failure cases (e.g., missing files, invalid format, error state)."
    : "";

  const system = `
You are a QA test planner. Given a user story, extract a maximum of 5 concise E2E test scenarios.
Use bullet points and Given–When–Then format. Prioritize functional requirements.
${includeNegativeCases}
${extrasText}
`;

  const prompt = `USER STORY:
${description}

${howToReproduceText}${criteriaText}

Generate E2E test scenarios accordingly.`;

  console.log("Prompt Engineer system prompt:", system);
  console.log("Prompt Engineer user prompt:", prompt);

  return await callOllamaLLM({ prompt, system });
}

module.exports = promptEngineer;
