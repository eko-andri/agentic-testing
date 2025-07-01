/**
 * MAIN ENTRY POINT
 * Unified server with all functionality consolidated
 * Main server file for Agentic Testing application
 */

require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

// Import consolidated modules
const { Orchestrator } = require("./orchestrator");
const {
  updateProgress,
  resetProgress,
  getProgress,
  callLLM,
} = require("./utils");

// Initialize LLM providers immediately after import
console.log("🚀 Initializing LLM providers...");
try {
  // Call the initialization function to set up providers
  const { initializeProviders } = require("./utils");
  initializeProviders();
  console.log("✅ LLM providers initialized successfully");
} catch (error) {
  console.error("❌ Failed to initialize LLM providers:", error.message);
}
const {
  BedrockClient,
  ListFoundationModelsCommand,
} = require("@aws-sdk/client-bedrock");
const {
  BedrockRuntimeClient,
  InvokeModelCommand,
} = require("@aws-sdk/client-bedrock-runtime");

const app = express();

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

const PORT = process.env.PORT || 3333;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, "../")));

// =============================================================================
// MAIN E2E PIPELINE ENDPOINT
// =============================================================================

app.post("/api/generate-test", async (req, res) => {
  console.log("📥 Test generation request received");

  try {
    const {
      description = "",
      acceptanceCriteria = "",
      htmlPath,
      testUrl,
      analysisMethod = "live-ui", // NEW: Analysis method from frontend
      framework = "playwright",
      options = {},
    } = req.body;

    console.log(`🔍 Analysis method: ${analysisMethod}`);
    console.log(`🌐 Test URL: ${testUrl}`);

    // Validate required parameters
    if (!testUrl) {
      return res.status(400).json({
        error: "Test URL is required for both analysis methods.",
      });
    }

    // Handle htmlPath resolution for file-based analysis
    let resolvedHtmlPath = htmlPath;
    if (analysisMethod === "file-based") {
      if (!resolvedHtmlPath && testUrl) {
        // Extract file path from URL like http://127.0.0.1:5500/policy-form.html
        const url = new URL(testUrl);
        const filename = path.basename(url.pathname);
        resolvedHtmlPath = path.resolve(__dirname, "../", filename);
      }

      if (!resolvedHtmlPath) {
        return res.status(400).json({
          error:
            "HTML path is required for file-based analysis. Please provide htmlPath or ensure testUrl points to an HTML file.",
        });
      }

      // Make sure path is absolute
      if (!path.isAbsolute(resolvedHtmlPath)) {
        resolvedHtmlPath = path.resolve(__dirname, "../", resolvedHtmlPath);
      }

      // Only check file existence for file-based analysis
      if (!fs.existsSync(resolvedHtmlPath)) {
        return res.status(400).json({
          error: `HTML file not found: ${resolvedHtmlPath}`,
        });
      }
    }

    // Create orchestrator with analysis method
    const orchestrator = new Orchestrator({
      description,
      acceptanceCriteria,
      htmlPath: resolvedHtmlPath, // Only used for file-based analysis
      testUrl,
      analysisMethod, // NEW: Pass analysis method to orchestrator
      framework,
      testGeneratorOptions: options,
      enabledAgents: {
        formAnalyzer: true,
        testGenerator: true,
      },
    });

    console.log(
      `🚀 Starting test generation pipeline with ${analysisMethod} analysis...`
    );
    const result = await orchestrator.run();

    res.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
      analysisMethod, // Include analysis method in response
    });
  } catch (error) {
    console.error("❌ Test generation failed:", error);

    updateProgress({
      status: "❌ Pipeline Failed\nOrchestration error occurred",
      prompt: error.message,
    });

    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// =============================================================================
// PROGRESS & STATUS ENDPOINTS
// =============================================================================

app.get("/progress", (req, res) => {
  res.json(getProgress());
});

app.get("/api/progress", (req, res) => {
  // Set up Server-Sent Events
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Cache-Control",
  });

  // Send initial progress
  const currentProgress = getProgress();
  res.write(`data: ${JSON.stringify(currentProgress)}\n\n`);

  // Set up progress listener
  const { onProgressUpdate } = require("./utils");
  const unsubscribe = onProgressUpdate((progress) => {
    try {
      res.write(`data: ${JSON.stringify(progress)}\n\n`);
    } catch (error) {
      console.error("SSE write error:", error.message);
    }
  });

  // Clean up on disconnect
  req.on("close", () => {
    unsubscribe();
  });

  req.on("aborted", () => {
    unsubscribe();
  });
});

app.post("/reset-progress", (req, res) => {
  resetProgress();
  res.json({ success: true, message: "Progress reset" });
});

// =============================================================================
// LLM PROVIDER ENDPOINTS
// =============================================================================

app.get("/providers", async (req, res) => {
  try {
    const providers = callLLM.getAvailableProviders();
    const current = callLLM.getCurrentProvider();

    res.json({
      success: true,
      providers,
      current,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/switch-provider", async (req, res) => {
  try {
    const { provider } = req.body;

    if (!provider) {
      return res.status(400).json({
        error: "Provider name is required",
      });
    }

    callLLM.switchProvider(provider);

    res.json({
      success: true,
      message: `Switched to provider: ${provider}`,
      current: callLLM.getCurrentProvider(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/test-provider", async (req, res) => {
  try {
    const { provider } = req.body;

    const result = await callLLM.testProvider(provider);

    res.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// =============================================================================
// HEALTH CHECK & INFO
// =============================================================================

app.get("/", (req, res) => {
  res.json({
    name: "Agentic Testing Server",
    version: "2.0.0-consolidated",
    status: "running",
    provider: callLLM.getCurrentProvider().name,
    timestamp: new Date().toISOString(),
    endpoints: {
      main: "POST /api/generate-test",
      progress: "GET /api/progress",
      providers: "GET /api/providers",
      health: "GET /api/health",
    },
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    provider: callLLM.getCurrentProvider(),
    timestamp: new Date().toISOString(),
  });
});

// Serve test HTML files for Playwright tests
app.get("/test-server/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "../", filename);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: "Test file not found" });
  }
});

app.get("/api/system-check", async (req, res) => {
  console.log("🔍 Running system check...");

  try {
    const { TestFileManager } = require("./utils");
    const testManager = new TestFileManager();

    // Check Playwright installation
    const playwrightCheck = await testManager.checkPlaywrightInstalled();

    // Check if test directory exists
    const testsDir = path.join(process.cwd(), "tests");
    const testsDirExists = fs.existsSync(testsDir);

    // Check npm/node versions
    let nodeVersion = "unknown";
    let npmVersion = "unknown";

    try {
      nodeVersion = process.version;
    } catch (e) {
      nodeVersion = "error";
    }

    const systemInfo = {
      status: "system check completed",
      node: {
        version: nodeVersion,
        platform: process.platform,
        arch: process.arch,
        cwd: process.cwd(),
      },
      playwright: playwrightCheck,
      directories: {
        testsDir: testsDir,
        testsDirExists: testsDirExists,
        nodeModules: fs.existsSync(path.join(process.cwd(), "node_modules")),
      },
      environment: {
        PATH: process.env.PATH ? "set" : "not set",
        NODE_ENV: process.env.NODE_ENV || "not set",
      },
      timestamp: new Date().toISOString(),
    };

    res.json(systemInfo);
  } catch (error) {
    res.status(500).json({
      status: "system check failed",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// =============================================================================
// TEST FILE GENERATION AND EXECUTION
// =============================================================================

app.post("/api/generate-and-run-test", async (req, res) => {
  console.log("📥 Generate and run test request received");

  try {
    const {
      playwrightCode,
      description = "",
      testUrl = "",
      checkExisting = true,
    } = req.body;

    if (!playwrightCode || playwrightCode.trim() === "") {
      return res.status(400).json({
        error: "Playwright code is required",
      });
    }

    // Import test file manager
    const { TestFileManager } = require("./utils");
    const testManager = new TestFileManager();

    // Check for existing tests first
    let finalCode = playwrightCode;
    let existingTestInfo = null;
    let filename;
    let usedIncrementalGeneration = false;

    if (checkExisting) {
      existingTestInfo = await testManager.findExistingTests(description);
      if (existingTestInfo.found) {
        console.log(`📄 Found existing test: ${existingTestInfo.filename}`);

        // Use incremental test generation for faster, targeted test creation
        console.log(`🔄 Using incremental test generation for faster results`);

        try {
          // Get existing test content
          const existingContent = require("fs").readFileSync(
            existingTestInfo.fullPath,
            "utf8"
          );

          // Create orchestrator to use incremental generation
          const { Orchestrator } = require("./orchestrator");
          const orchestrator = new Orchestrator({
            description,
            acceptanceCriteria: "",
            htmlPath: null,
            testUrl: testUrl,
            framework: "playwright",
            testGeneratorOptions: {},
          });

          // Parse form analysis from existing test or create minimal analysis
          const formAnalysis = {
            formFields: [
              { name: "main_field", type: "text", selector: "#main-field" },
            ],
            submitButton: 'button[type="submit"]',
          };

          // Generate incremental tests
          const incrementalResult = await orchestrator.generateIncrementalTests(
            existingContent,
            description,
            formAnalysis,
            testUrl
          );

          // Merge with existing test using the incremental approach
          finalCode = await testManager.mergeWithExistingTest(
            existingTestInfo.filename,
            incrementalResult.code, // Use incremental code instead of full code
            description
          );

          usedIncrementalGeneration = true;
          console.log(
            `✅ Incremental generation successful: added ${
              incrementalResult.metadata?.testCount || 0
            } new test cases`
          );
        } catch (incrementalError) {
          console.warn(
            `⚠️ Incremental generation failed, falling back to full merge:`,
            incrementalError.message
          );

          // Fallback to original merge approach
          finalCode = await testManager.mergeWithExistingTest(
            existingTestInfo.filename,
            playwrightCode,
            description
          );
        }

        // Use existing filename instead of generating new one
        filename = existingTestInfo.filename;
      } else {
        // Generate new filename if no existing test found
        filename = testManager.generateTestFileName(description);
      }
    } else {
      // Generate new filename if not checking existing
      filename = testManager.generateTestFileName(description);
    }

    // Write test file
    const testFilePath = await testManager.writeTestFile(filename, finalCode);
    console.log(`📝 Test file created: ${testFilePath}`);

    // Check Playwright installation with timeout
    console.log("🔍 Checking Playwright installation...");
    const playwrightCheck = await Promise.race([
      testManager.checkPlaywrightInstalled(),
      new Promise((resolve) =>
        setTimeout(
          () =>
            resolve({
              installed: false,
              npxAvailable: false,
              error: "Installation check timed out",
            }),
          8000
        )
      ),
    ]);

    console.log("📋 Playwright check result:", playwrightCheck);

    if (!playwrightCheck.installed) {
      return res.status(500).json({
        error: playwrightCheck.error || "Playwright not available",
        testFileCreated: testFilePath,
        code: finalCode,
        suggestions: [
          "Run: npm install @playwright/test",
          "Run: npx playwright install",
          "Ensure Node.js/npm is in PATH",
          "Try: npx playwright --version",
        ],
      });
    }

    // If npx check fails but Playwright is installed, proceed anyway
    if (!playwrightCheck.npxAvailable) {
      console.log(
        "⚠️ npx not available, but proceeding with alternative methods"
      );
    }

    // Run the test with timeout
    console.log(`🎭 Running Playwright test: ${testFilePath}`);
    const testResults = await Promise.race([
      testManager.runTest(testFilePath, {
        headless: true,
        timeout: 25000,
      }),
      new Promise((resolve) =>
        setTimeout(
          () =>
            resolve({
              success: false,
              error: "Test execution timed out after 30 seconds",
              suggestions: [
                "Check if test server is running",
                "Verify selectors in test file",
                "Try running test manually: npx playwright test " +
                  testFilePath,
              ],
            }),
          30000
        )
      ),
    ]);

    console.log(
      "🎭 Test execution completed:",
      testResults.success ? "✅" : "❌"
    );

    res.json({
      success: true,
      testFileCreated: testFilePath,
      existingTestInfo,
      testResults,
      playwrightCode: finalCode,
      usedIncrementalGeneration,
      generationMethod: usedIncrementalGeneration ? "incremental" : "full",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Generate and run test failed:", error);

    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Debug endpoint for testing without execution
app.post("/api/create-test-file-only", async (req, res) => {
  console.log("📁 Create test file only request received");

  try {
    const { playwrightCode, description = "", testUrl = "" } = req.body;

    if (!playwrightCode || playwrightCode.trim() === "") {
      return res.status(400).json({
        error: "Playwright code is required",
      });
    }

    const { TestFileManager } = require("./utils");
    const testManager = new TestFileManager();

    // Generate filename
    const filename = testManager.generateTestFileName(description);

    // Write test file
    const testFilePath = await testManager.writeTestFile(
      filename,
      playwrightCode
    );

    res.json({
      success: true,
      message: "Test file created successfully (not executed)",
      testFileCreated: testFilePath,
      playwrightCode: playwrightCode,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Create test file failed:", error);

    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

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
    if (
      !response ||
      !response.modelSummaries ||
      response.modelSummaries.length === 0
    ) {
      return res.status(500).json({
        error:
          "Bedrock API tidak mengembalikan model. Pastikan credential, region, dan akses Anda ke Bedrock sudah benar. Jika Anda belum punya akses Bedrock, endpoint ini memang tidak akan mengembalikan data.",
      });
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
          "4. Jika menggunakan akun sandbox/lab, coba gunakan kredensial AWS yang memiliki akses lebih luas",
        ],
        requestId: error.$metadata?.requestId || "unknown",
      });
    }

    // Periksa apakah ada informasi metadata
    if (error && error.$metadata) {
      return res.status(500).json({
        error: `Bedrock API error: Status ${
          error.$metadata.httpStatusCode || "unknown"
        }`,
        details: `Pastikan AWS credentials, region (${process.env.AWS_REGION}), dan service endpoint Anda benar. Anda juga perlu memiliki akses ke Amazon Bedrock.`,
        requestId: error.$metadata.requestId || "unknown",
      });
    }

    // Fallback error handling
    res.status(500).json({
      error: "Failed to list Bedrock models",
      message: error.message || String(error),
      suggestion:
        "Periksa AWS credentials, region, dan pastikan Anda memiliki akses ke layanan Amazon Bedrock.",
    });
  }
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);

  res.status(500).json({
    success: false,
    error: error.message || "Internal server error",
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    available: [
      "POST /api/generate-test",
      "GET /api/progress",
      "GET /api/providers",
      "GET /api/health",
      "GET /api/bedrock-models",
      "POST /api/generate-and-run-test",
    ],
  });
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

app.listen(PORT, async () => {
  console.log(`🚀 Agentic Testing Server v2.0 (Consolidated)`);
  console.log(`📡 Server running on http://localhost:${PORT}`);

  // Get current provider info after initialization
  const currentProviderInfo = callLLM.getCurrentProvider();
  console.log(`🤖 LLM Provider: ${currentProviderInfo.name}`);
  console.log(`🧠 Model: ${currentProviderInfo.model}`);

  // Test connection to current provider
  console.log(`🔍 Testing ${currentProviderInfo.name} connection...`);
  try {
    const testResult = await callLLM.testProvider();
    if (testResult.success) {
      console.log(`✅ ${currentProviderInfo.name} connection successful`);
    } else {
      console.log(
        `❌ ${currentProviderInfo.name} connection failed: ${testResult.error}`
      );
      console.log(`💡 You may need to:`);
      if (currentProviderInfo.name === "Ollama") {
        console.log(`   - Start Ollama server: ollama serve`);
        console.log(`   - Or install and start Ollama from https://ollama.ai`);
      }
      if (currentProviderInfo.name === "AWS Bedrock") {
        console.log(`   - Check AWS credentials in .env file`);
        console.log(`   - Ensure AWS region is supported for Bedrock`);
      }
    }
  } catch (error) {
    console.log(`⚠️  Could not test provider connection: ${error.message}`);
  }

  console.log(`📚 Available endpoints:`);
  console.log(`   POST /api/generate-test - Main test generation`);
  console.log(`   POST /api/generate-and-run-test - Generate and run test`);
  console.log(`   GET  /api/progress - Check progress`);
  console.log(`   GET  /api/providers - List LLM providers`);
  console.log(`   GET  /api/bedrock-models - List Bedrock models`);
  console.log(`   GET  /api/health - Health check`);
});

module.exports = app;
