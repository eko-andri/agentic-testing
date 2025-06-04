const express = require("express");
const bodyParser = require("body-parser");
const promptEngineer = require("./agents/promptEngineer");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Simple endpoint to run full E2E agentic pipeline
app.post("/api/run-e2e", async (req, res) => {
  const { inputText, appName } = req.body;
  console.log("Received request to run E2E pipeline", {
    inputText,
    appName,
  });

  if (!inputText)
    return res.status(400).json({ error: "inputText is required" });

  try {
    // Agent A: extract test plan
    const testPlan = await promptEngineer(inputText);
    console.log("Received request to run E2E pipeline", {
      inputText,
      appName,
    });

    /*
    // Agent B: generate playwright test code
    const testCode = await testGenerator(testPlan);

    // Agent C: run playwright test
    const testResult = await testRunner(testCode, appName);

    // Agent D: write documentation
    const docPath = await docAgent(testPlan, testResult, {
      filePath: testResult.filePath,
    });
    */

    res.json({
      success: true,
      testPlan,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () =>
  console.log(`Agentic E2E app listening on port ${PORT}`)
);
