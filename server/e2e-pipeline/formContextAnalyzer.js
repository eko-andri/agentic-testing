const fs = require("fs");
const callOllamaLLM = require("../utils/llmOllama");
const { updateProgress } = require("./progressStatus");

function extractSafeJson(output) {
  // Hilangkan backtick block jika ada
  const cleaned = output.replace(/```json|```/gi, "").trim();

  // Coba parse JSON, kalau gagal, lempar raw output
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error("Failed to parse JSON from LLM output:\n" + cleaned);
  }
}

async function analyzeFormContext(htmlPath, description, acceptanceCriteria) {
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`HTML file not found at ${htmlPath}`);
  }

  const htmlContent = fs.readFileSync(htmlPath, "utf8");
  const system = `You are a Form Context Analyzer Agent. Your job is to extract all form field names, types, required status, 
  and validations from the HTML content. Then, return a JSON object summarizing the form structure, including test strategies 
  based on field types and expected validations.`;

  const prompt = `
Given the following form HTML and requirement:

--- HTML Content ---
${htmlContent}

--- Requirement ---
Description: ${description}
Acceptance Criteria: ${acceptanceCriteria}

Please output JSON with structure:
{
  "fields": {
    "dob": {
      "type": "date",
      "required": true,
      "validation": ["nonEmpty", "minAge:16"],
      "messages": { "empty": "...", "minAge": "..." },
      "testingStrategies": [...]
    },
    ...
  },
  "recommendedTestScenarios": [...]
}`;

  try {
    const combinedPrompt = `${system}\n\n${prompt}`;
    updateProgress({
      status: "Analyzing form structure...",
      prompt: combinedPrompt,
    });
    const result = await callOllamaLLM({ prompt, system, temperature: 0.2 });
    return extractSafeJson(result);
  } catch (e) {
    throw new Error("Failed to parse JSON from LLM output: " + result);
  }
}

module.exports = analyzeFormContext;
