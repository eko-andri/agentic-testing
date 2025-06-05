const express = require("express");
const bodyParser = require("body-parser");
const orchestrateTestPlan = require("./agents/orchestrator");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

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

const PORT = process.env.PORT || 3333;
app.listen(PORT, () =>
  console.log(`Agentic E2E app listening on port ${PORT}`)
);
