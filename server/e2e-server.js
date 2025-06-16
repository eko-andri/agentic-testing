const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const Orchestrator = require("./e2e-pipeline/orchestrator");
const { getCurrentProgress } = require("./e2e-pipeline/progressStatus");

const app = express();
app.use(cors());
app.use(bodyParser.json());

function findFileUpwards(filename, startDir = __dirname) {
  let dir = startDir;

  while (dir !== path.parse(dir).root) {
    const candidate = path.join(dir, filename);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    dir = path.dirname(dir);
  }

  throw new Error(
    `File "${filename}" not found when searching from ${startDir}`
  );
}

app.post("/api/run-e2e", async (req, res) => {
  const { description, acceptanceCriteria, testUrl, extras } = req.body;
  const filename = path.basename(new URL(testUrl).pathname);
  const htmlPath = findFileUpwards(filename, __dirname);

  const orchestrator = new Orchestrator({
    description,
    acceptanceCriteria,
    htmlPath,
    extras,
    maxRetries: 3,
    enabledAgents: {
      formAnalyzer: true,
      promptEngineer: false,
      criticAgent: false,
      testGenerator: false,
      reviewAgent: false,
    },
  });

  try {
    const result = await orchestrator.run();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/progress", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sendProgress = () => {
    const progress = getCurrentProgress();
    res.write(`data: ${JSON.stringify(progress)}\n\n`);
  };

  // Kirim progres pertama langsung
  sendProgress();

  // Kirim setiap 1 detik
  const interval = setInterval(sendProgress, 1000);

  req.on("close", () => {
    clearInterval(interval);
  });
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
