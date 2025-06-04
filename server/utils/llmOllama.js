// utils/llmOllama.js
const axios = require("axios");

async function callOllamaLLM({
  prompt,
  model = "qwen2.5-coder:7b",
  system = "",
  temperature = 0.6,
}) {
  const response = await axios.post(
    "http://localhost:11434/api/generate",
    {
      model,
      prompt,
      stream: false,
      system,
      options: { temperature },
    },
    { timeout: 60_000 }
  );

  // Output ada di response.data.response
  return response.data.response.trim();
}

module.exports = callOllamaLLM;
