require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const orchestrateTestPlan = require("./agents/orchestrator");
const cors = require("cors");
const {
  BedrockClient,
  ListFoundationModelsCommand,
} = require("@aws-sdk/client-bedrock");
const {
  BedrockRuntimeClient,
  InvokeModelCommand,
} = require("@aws-sdk/client-bedrock-runtime");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

app.post("/api/bedrock", async (req, res) => {
  try {
    const { prompt } = req.body;

    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-3-sonnet-20240229-v1:0", // atau model lain
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    res.json(responseBody);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to call Bedrock" });
  }
});

// Simple endpoint to run full E2E agentic pipeline
app.post("/api/run-e2e", async (req, res) => {
  const {
    ticketNumber,
    ticketType,
    description,
    howToReproduce,
    acceptanceCriteria,
    extras,
  } = req.body;
  console.log("Received request to run E2E pipeline", {
    ticketNumber,
    ticketType,
    description,
    howToReproduce,
    acceptanceCriteria,
    extras,
  });
  console.log("Request body:", req.body);

  if (!description || !acceptanceCriteria)
    return res
      .status(400)
      .json({ error: "Description and acceptance criteria are required" });

  try {
    const result = await orchestrateTestPlan({
      description,
      howToReproduce,
      acceptanceCriteria,
      extras,
      maxRetries: 5, // can be adjusted
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/bedrock-models", async (req, res) => {
  console.log("Fetching Bedrock models...");
  console.log("Using AWS region:", process.env.AWS_REGION);

  try {
    const command = new ListFoundationModelsCommand({});
    const response = await client.send(command);
    res.json(response.modelSummaries);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to list models" });
  }
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () =>
  console.log(`Agentic E2E app listening on port ${PORT}`)
);
