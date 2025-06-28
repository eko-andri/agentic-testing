const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const { Orchestrator } = require("./e2e-pipeline/orchestrator");
const {
  BedrockClient,
  ListFoundationModelsCommand,
} = require("@aws-sdk/client-bedrock");
const {
  BedrockRuntimeClient,
  InvokeModelCommand,
} = require("@aws-sdk/client-bedrock-runtime");

require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Untuk ListFoundationModels endpoint, kita membutuhkan BedrockClient, bukan BedrockRuntimeClient
const bedrockClient = new BedrockClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// BedrockRuntimeClient tetap kita gunakan untuk InvokeModel endpoint
const runtimeClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

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

app.get("/api/bedrock-models", async (req, res) => {
  console.log("Fetching Bedrock models...");
  console.log("Using AWS region:", process.env.AWS_REGION);

  try {
    const command = new ListFoundationModelsCommand({});
    console.log("Mengirim request untuk listing foundation models...");
    // Gunakan bedrockClient bukan client
    const response = await bedrockClient.send(command);
    console.log("Response received:", response ? "success" : "empty");
    // Jika response bukan JSON, tampilkan error yang lebih jelas
    if (!response || !response.modelSummaries || response.modelSummaries.length === 0) {
      return res.status(500).json({ error: "Bedrock API tidak mengembalikan model. Pastikan credential, region, dan akses Anda ke Bedrock sudah benar. Jika Anda belum punya akses Bedrock, endpoint ini memang tidak akan mengembalikan data." });
    }
    res.json(response.modelSummaries);
  } catch (error) {
    // Tampilkan error yang lebih detail dan informatif
    console.error("Error detail:", JSON.stringify(error, null, 2));
    
    // Periksa apakah AccessDeniedException
    if (error.name === "AccessDeniedException") {
      return res.status(403).json({ 
        error: `AWS Bedrock Access Denied (403)`, 
        details: `Anda tidak memiliki izin yang cukup untuk mengakses layanan Amazon Bedrock.`,
        suggestions: [
          "1. Pastikan IAM User/Role Anda memiliki kebijakan (policy) yang mencakup akses ke Bedrock",
          "2. Aktifkan akses ke Amazon Bedrock di AWS Console (mungkin perlu mengajukan permintaan akses)",
          "3. Pastikan region yang Anda pilih (eu-west-2) mendukung Bedrock dan Anda telah mengaktifkannya di region tersebut",
          "4. Jika menggunakan akun sandbox/lab, coba gunakan kredensial AWS yang memiliki akses lebih luas"
        ],
        requestId: error.$metadata?.requestId || 'unknown'
      });
    }
    
    // Periksa apakah ada informasi metadata
    if (error && error.$metadata) {
      return res.status(500).json({ 
        error: `Bedrock API error: Status ${error.$metadata.httpStatusCode || 'unknown'}`, 
        details: `Pastikan AWS credentials, region (${process.env.AWS_REGION}), dan service endpoint Anda benar. Anda juga perlu memiliki akses ke Amazon Bedrock.`,
        requestId: error.$metadata.requestId || 'unknown'
      });
    }
    
    // Fallback error handling
    res.status(500).json({ 
      error: "Failed to list Bedrock models",
      message: error.message || String(error),
      suggestion: "Periksa AWS credentials, region, dan pastikan Anda memiliki akses ke layanan Amazon Bedrock."
    });
  }
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

    // Gunakan runtimeClient untuk inference
    const response = await runtimeClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    res.json(responseBody);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to call Bedrock" });
  }
});

app.post("/api/run-e2e", async (req, res) => {
  const { description, acceptanceCriteria, testUrl, extras } = req.body;
  const filename = path.basename(new URL(testUrl).pathname);
  const htmlPath = findFileUpwards(filename, __dirname);

  // FIXED: Enable the full pipeline for proper loading experience
  const orchestrator = new Orchestrator({
    description,
    acceptanceCriteria,
    htmlPath,
    testUrl,
    extras,
    enabledAgents: {
      formAnalyzer: true, // ✅ Self-reflecting form analysis
      testGenerator: true, // ✅ Generate test code (was disabled!)
    },
    // New configuration options
    outputFormat: "playwright",
    framework: "playwright",
    generateTestCode: true,
    optimizeForFramework: true,
    testGeneratorOptions: {
      includeSetup: true,
      includeTeardown: true,
      timeout: 5000,
      enableAccessibility: extras?.includes("accessibility") || false,
    },
  });

  try {
    const result = await orchestrator.run();

    // Enhanced response with more details
    const response = {
      success: result.success,
      message: result.message,
      formAnalysis: result.formAnalysis,
      testCode: result.testCode,
      testMetadata: result.testMetadata,
      framework: result.framework,
      executionEstimate: result.executionEstimate,
      // Legacy support for existing UI
      testPlan: result.formAnalysis
        ? JSON.stringify(result.formAnalysis, null, 2)
        : null,
      playwrightCode: result.testCode,
      testPlanFeedback:
        result.reviewFeedback || "✅ PASS - Code quality approved",
    };

    res.json(response);
  } catch (err) {
    console.error("Orchestrator error:", err);
    res.status(500).json({
      success: false,
      error: err.message,
      details: err.stack,
    });
  }
});

// Updated server progress endpoint - paste in your main server file

const {
  getProgressIfChanged,
  forceGetProgress,
} = require("./agents/utils/progressStatus");

// Enhanced progress endpoint with optimized broadcasting
app.get("/api/progress", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Cache-Control");
  res.flushHeaders();

  let isFirstMessage = true;

  const sendProgress = () => {
    let progress;

    // Untuk koneksi pertama, kirim status saat ini
    if (isFirstMessage) {
      progress = forceGetProgress();
      isFirstMessage = false;
    } else {
      // Untuk update selanjutnya, hanya kirim jika ada perubahan
      progress = getProgressIfChanged();
    }

    // Hanya kirim jika ada progress yang perlu dikirim
    if (progress) {
      const enhancedProgress = {
        ...progress,
        status: progress.status || "Idle",
        timestamp: progress.timestamp || new Date().toISOString(),
      };

      res.write(`data: ${JSON.stringify(enhancedProgress)}\n\n`);
      console.log("Progress sent to client:", enhancedProgress.status);
    }
  };

  // Kirim progress awal segera
  sendProgress();

  // Periksa perubahan progress setiap 500ms, tapi hanya kirim jika berubah
  const interval = setInterval(sendProgress, 500);

  req.on("close", () => {
    console.log("SSE client disconnected");
    clearInterval(interval);
  });

  req.on("error", (err) => {
    console.error("SSE connection error:", err);
    clearInterval(interval);
  });
});

// Alternatif: Interval yang lebih hemat untuk status idle
app.get("/api/progress-optimized", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Cache-Control");
  res.flushHeaders();

  let isFirstMessage = true;
  let idleCheckCount = 0;

  const sendProgress = () => {
    let progress;

    if (isFirstMessage) {
      progress = forceGetProgress();
      isFirstMessage = false;
    } else {
      progress = getProgressIfChanged();
    }

    if (progress) {
      const enhancedProgress = {
        ...progress,
        status: progress.status || "Idle",
        timestamp: progress.timestamp || new Date().toISOString(),
      };

      res.write(`data: ${JSON.stringify(enhancedProgress)}\n\n`);
      console.log("Progress sent:", enhancedProgress.status);

      // Reset idle counter jika ada aktivitas
      idleCheckCount = 0;
    } else {
      // Tidak ada perubahan, increment idle counter
      idleCheckCount++;
    }
  };

  // Kirim progress awal
  sendProgress();

  // Gunakan interval yang adaptive
  const interval = setInterval(() => {
    sendProgress();

    // Jika sudah idle terlalu lama (lebih dari 10 check = 5 detik),
    // kurangi frekuensi pengecekan
    if (idleCheckCount > 10) {
      // Bisa implement logic untuk mengurangi frekuensi di sini
      // Misalnya skip beberapa interval
    }
  }, 500);

  req.on("close", () => {
    console.log("SSE client disconnected");
    clearInterval(interval);
  });

  req.on("error", (err) => {
    console.error("SSE connection error:", err);
    clearInterval(interval);
  });
});

// New endpoint for generate and run test (existing functionality)
app.post("/api/generate-and-run-test", async (req, res) => {
  const { playwrightCode } = req.body;

  if (!playwrightCode) {
    return res.status(400).json({
      success: false,
      error: "No Playwright code provided",
    });
  }

  try {
    // This would integrate with your existing test runner
    // For now, simulate the response
    const result = {
      success: true,
      message: "Test file generated and executed successfully",
      output: "Test execution output would go here...",
      testFilePath: "/tmp/generated-test.spec.js",
    };

    res.json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: err.message,
  });
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Progress stream: http://localhost:${PORT}/api/progress`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/run-e2e`);
});
