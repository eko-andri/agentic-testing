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
const {
  getCurrentProgress,
  getProgressIfChanged,
  setCurrentProgress,
} = require("./agents/utils/progressStatus");
const fs = require("fs");
const path = require("path");
const { runPlaywrightTest } = require("./agents/testRunner");

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
    testUrl,
    extras,
  } = req.body;
  console.log("Received request to run E2E pipeline", {
    ticketNumber,
    ticketType,
    description,
    howToReproduce,
    acceptanceCriteria,
    testUrl,
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
      testUrl,
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

let currentProgress = "Idle";

app.get("/api/progress", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Kirim status awal jika bukan idle
  let lastStatus = null;
  const sendStatus = () => {
    const progress = getProgressIfChanged();
    if (
      progress &&
      (progress.status !== lastStatus?.status ||
        progress.prompt !== lastStatus?.prompt)
    ) {
      res.write(`data: ${JSON.stringify(progress)}\n\n`);
      lastStatus = { ...progress };
    }
  };
  sendStatus();
  const interval = setInterval(sendStatus, 1000);

  req.on("close", () => {
    clearInterval(interval);
    res.end();
  });
});

app.post("/api/generate-and-run-test", async (req, res) => {
  try {
    let { playwrightCode } = req.body;
    if (
      !playwrightCode ||
      typeof playwrightCode !== "string" ||
      playwrightCode.trim() === ""
    ) {
      setCurrentProgress({
        status: "Error: No Playwright code provided.",
        prompt: playwrightCode,
      });
      return res
        .status(400)
        .json({ success: false, error: "No Playwright code provided." });
    }
    setCurrentProgress({
      status: "Generating test file...",
      prompt: playwrightCode,
    });
    // Hapus baris backtick pembuka/penutup jika ada
    playwrightCode = playwrightCode.replace(/```[a-z]*|```/gi, "").trim();
    // Hapus HTML jika ada (jika LLM masih bandel)
    playwrightCode = playwrightCode
      .replace(/<html[\s\S]*?<\/html>/gi, "")
      .trim();
    // Simpan kode ke file baru di folder tests
    const fileName = `test_auto_${Date.now()}.spec.js`;
    const filePath = path.join(__dirname, "./tests", fileName);
    fs.writeFileSync(filePath, playwrightCode, "utf8");
    setCurrentProgress({
      status: "Running test file...",
      prompt: playwrightCode,
    });
    // Jalankan test menggunakan testRunner
    let output = "";
    try {
      const result = await runPlaywrightTest(filePath);
      console.log("[Generate & Run Test] Playwright result:", result);
      output =
        typeof result === "string" ? result : JSON.stringify(result, null, 2);
      setCurrentProgress({ status: "Test finished.", prompt: playwrightCode });
      res.json({ success: true, output, file: fileName });
    } catch (err) {
      setCurrentProgress({
        status: "Error running test file.",
        prompt: playwrightCode,
      });
      console.error("[Generate & Run Test] Playwright error:", err);
      res.json({ success: false, error: err.message || err });
    }
  } catch (err) {
    setCurrentProgress({
      status: "Error running test file.",
      prompt: req.body?.playwrightCode || "",
    });
    console.error("[Generate & Run Test] General error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () =>
  console.log(`Agentic E2E app listening on port ${PORT}`)
);
