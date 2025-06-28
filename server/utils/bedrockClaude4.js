// AWS Bedrock Claude 4 integration for Node.js
// This file is required for llmOllama.js to work with AWS Bedrock
const {
  BedrockRuntimeClient,
  InvokeModelCommand,
} = require("@aws-sdk/client-bedrock-runtime");
require("dotenv").config();

const REGION = process.env.AWS_REGION;
const ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
const SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY;

const AI = {
  claude: {
    sonnet3: "anthropic.claude-3-sonnet-20240229-v1:0",
    sonnet35v2: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    sonnet37: "anthropic.claude-3-7-sonnet-20250219-v1:0",
    sonnet4: "apac.anthropic.claude-sonnet-4-20250514-v1:0",
  },
};

const bedrockClient = new BedrockRuntimeClient({
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
});

// Mapping modelId ke inference profile ARN
const CLAUDE_PROFILE_MAP = {
  "apac.anthropic.claude-sonnet-4-20250514-v1:0":
    "arn:aws:bedrock:ap-southeast-1:518870435381:inference-profile/apac.anthropic.claude-sonnet-4-20250514-v1:0",
  "anthropic.claude-3-sonnet-20240229-v1:0":
    "arn:aws:bedrock:ap-southeast-1:518870435381:inference-profile/apac.anthropic.claude-3-sonnet-20240229-v1:0",
  // Tambahkan mapping lain di sini jika ada profile baru
};

async function callBedrockClaude4({
  prompt,
  model = AI.claude.sonnet4,
  system = "",
  temperature = 0.1,
  max_tokens = 3000,
}) {
  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    throw new Error("Invalid prompt provided");
  }
  const body = {
    anthropic_version: "bedrock-2023-05-31",
    ...(system ? { system } : {}), // system sebagai top-level property
    messages: [{ role: "user", content: prompt }],
    max_tokens,
    temperature,
    // Add these for better JSON consistency:
    stop_sequences: ["```"], // Stop at code block end
    top_p: 0.9,
    top_k: 250,
  };
  const profileArn = CLAUDE_PROFILE_MAP[model];
  if (!profileArn) {
    throw new Error("No inference profile ARN found for model: " + model);
  }

  const command = new InvokeModelCommand({
    modelId: model,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(body),
    inferenceConfig: {
      profileArn,
    },
  });
  try {
    const response = await bedrockClient.send(command);
    const json = JSON.parse(new TextDecoder().decode(response.body));
    // Claude 3/4 returns { content: [{text: ...}] }
    return json.content?.map((c) => c.text).join("") || "";
  } catch (error) {
    throw new Error(error.message || "Error from AWS Bedrock Claude 4");
  }
}

module.exports = callBedrockClaude4;
