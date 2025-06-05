// utils/llmOllama.js
const axios = require("axios");

const AI = {
  qwen2_5: {
    latest: "qwen2.5-coder:latest",
    small: "qwen2.5-coder:1b",
    medium: "qwen2.5-coder:3b",
    large: "qwen2.5-coder:7b",
  },
};

async function callOllamaLLM({
  prompt,
  model = AI.qwen2_5.large,
  system = "",
  temperature = 0.6,
}) {
  // Validasi sederhana (opsional, hanya untuk keamanan input)
  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    throw new Error("Invalid prompt provided");
  }
  if (system && typeof system !== "string") {
    throw new Error("System must be a string");
  }
  if (typeof temperature !== "number" || temperature < 0 || temperature > 1) {
    throw new Error("Temperature must be a number between 0 and 1");
  }
  if (typeof model !== "string" || !model.trim()) {
    throw new Error("Model must be a non-empty string");
  }
  // Tidak perlu validasi model manual, biarkan Ollama yang handle
  try {
    console.log("Calling Ollama API with model:", model);
    const response = await axios.post(
      "http://localhost:11434/api/generate",
      {
        model,
        prompt,
        stream: false,
        system,
        options: { temperature },
      },
      { timeout: 600_000 }
    );
    return response.data.response.trim();
  } catch (error) {
    // Tangani error dari Ollama (misal model tidak ditemukan)
    throw new Error(
      error.response?.data?.error ||
        error.message ||
        "Unknown error from Ollama"
    );
  }
}

module.exports = callOllamaLLM;
