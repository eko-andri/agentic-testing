/**
 * CONSOLIDATED UTILITIES
 * All utility functions, parsers, and helpers in one place
 * Combines utils/callLLM + utils/PlaywrightParser + framework helpers + progress tracking
 */

const axios = require("axios");
const {
  BedrockRuntimeClient,
  InvokeModelCommand,
} = require("@aws-sdk/client-bedrock-runtime");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

// =============================================================================
// LLM PROVIDERS & CALLING
// =============================================================================

// Provider configurations - Optimized for MacBook M1 16GB
const PROVIDERS = {
  ollama: {
    name: "Ollama",
    handler: null, // Will be set below
    available: true,
    defaultModel: "qwen3:30b", // Back to 7B as primary untuk performa optimal
    description:
      "Local Ollama server with Qwen 2.5 Coder 7B (optimal for M1 16GB)",
  },

  "ollama-advanced": {
    name: "Ollama Advanced",
    handler: null, // Will be set below
    available: true,
    defaultModel: "qwen3:14b",
    description:
      "Local Ollama server with Qwen 3 14B (untuk task kompleks, butuh waktu)",
  },

  bedrock: {
    name: "AWS Bedrock",
    handler: null, // Will be set below
    available: false,
    defaultModel: "us.anthropic.claude-3-haiku-20240307-v1:0",
    description: "AWS Bedrock Claude",
  },
};

const DEFAULT_PROVIDER = process.env.LLM_PROVIDER || "ollama"; // Change default to bedrock if available
let DEFAULT_MODEL = process.env.LLM_MODEL;

let currentProvider = DEFAULT_PROVIDER;
let providerHandlers = {};

/**
 * Ollama LLM Implementation - Optimized untuk MacBook M1
 */
async function callOllamaLLM({
  prompt,
  system = "",
  temperature = 0.3,
  model = "qwen3:30b",
}) {
  const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";

  // Adaptive timeout berdasarkan model size
  const timeoutMs =
    model.includes("14b") || model.includes("30b") || model.includes("32b")
      ? process.env.LLM_TIMEOUT || 100 // 10 menit untuk model besar
      : 300000; // 5 menit untuk model standard

  const requestBody = {
    model,
    prompt: system ? `${system}\n\n${prompt}` : prompt,
    stream: false,
    options: {
      temperature: Math.max(0, Math.min(1, temperature)),
      num_predict: 4000,
      // Optimasi memory untuk MacBook M1
      num_ctx: model.includes("14b") ? 2048 : 4096, // Reduce context untuk model besar
    },
  };

  console.log(
    `Calling Ollama API with model: ${model} ${temperature} (timeout: ${
      timeoutMs / 1000
    }s)`
  );

  try {
    const response = await axios.post(
      `${ollamaUrl}/api/generate`,
      requestBody,
      {
        timeout: timeoutMs,
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.data?.response) {
      throw new Error("Invalid response from Ollama API");
    }

    return response.data.response.trim();
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      throw new Error(
        "Cannot connect to Ollama server. Make sure Ollama is running on http://localhost:11434"
      );
    }
    if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
      throw new Error(
        `Ollama API timeout after ${
          timeoutMs / 1000
        }s. Model ${model} might be too large for available memory.`
      );
    }
    throw new Error(`Ollama API call failed: ${error.message}`);
  }
}

/**
 * Bedrock Claude Implementation
 */
async function callBedrockClaude({
  prompt,
  system = "",
  temperature = 0.3,
  model = null,
  maxTokens = 4000,
}) {
  const DEFAULT_CONFIG = {
    region: process.env.AWS_REGION || "us-east-1",
    model: "us.anthropic.claude-3-haiku-20240307-v1:0",
    maxTokens: 4000,
    temperature: 0.3,
  };

  const CLAUDE_MODELS = {
    "claude-3-sonnet": "us.anthropic.claude-3-sonnet-20240229-v1:0",
    "claude-3-haiku": "us.anthropic.claude-3-haiku-20240307-v1:0",
    "claude-3-opus": "us.anthropic.claude-3-opus-20240229-v1:0",
    "claude-3.5-sonnet": "us.anthropic.claude-3-5-sonnet-20240620-v1:0",
  };

  function getModelId(modelName) {
    if (!modelName) return DEFAULT_CONFIG.model;
    if (modelName.includes("anthropic.claude")) return modelName;
    return CLAUDE_MODELS[modelName.toLowerCase()] || DEFAULT_CONFIG.model;
  }

  try {
    const config = { region: DEFAULT_CONFIG.region };
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN,
      };
    }

    const client = new BedrockRuntimeClient(config);
    const modelId = getModelId(model);

    const messageFormat = {
      system: system.trim(),
      messages: [{ role: "user", content: prompt }],
    };

    const requestBody = {
      max_tokens: maxTokens,
      temperature: Math.max(0, Math.min(1, temperature)),
      ...messageFormat,
    };

    console.log(
      `[BedrockClaude4] Calling ${modelId} with ${requestBody.messages.length} messages`
    );

    const command = new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(requestBody),
    });

    const response = await client.send(command);
    if (!response.body) throw new Error("Empty response from Bedrock");

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    if (!responseBody.content?.[0]?.text)
      throw new Error("No text content in Claude response");

    const result = responseBody.content[0].text.trim();
    console.log(`[BedrockClaude4] Generated ${result.length} characters`);

    return result;
  } catch (error) {
    const errorMap = {
      ValidationException: `Bedrock validation error: ${error.message}`,
      ResourceNotFoundException: `Bedrock model not found: ${error.message}`,
      AccessDeniedException: `Bedrock access denied: Check AWS credentials and permissions`,
      ThrottlingException: `Bedrock throttled: ${error.message}`,
      ServiceQuotaExceededException: `Bedrock quota exceeded: ${error.message}`,
    };

    throw new Error(
      errorMap[error.name] || `Bedrock call failed: ${error.message}`
    );
  }
}

/**
 * Initialize provider handlers
 */
function initializeProviders() {
  console.log("[callLLM] Initializing LLM providers...");

  // Initialize both Ollama handlers (standard and advanced)
  providerHandlers.ollama = callOllamaLLM;
  providerHandlers["ollama-advanced"] = callOllamaLLM;
  PROVIDERS.ollama.handler = callOllamaLLM;
  PROVIDERS["ollama-advanced"].handler = callOllamaLLM;

  // Test Ollama connection with optimal model
  const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
  console.log(`[callLLM] Testing Ollama connection at ${ollamaUrl}...`);
  console.log(`[callLLM] Primary model: qwen3:30b (optimal for M1 16GB)`);
  console.log(
    `[callLLM] Advanced model: qwen3:14b (available untuk task kompleks)`
  );

  // Initialize Bedrock if credentials are available
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    try {
      providerHandlers.bedrock = callBedrockClaude;
      PROVIDERS.bedrock.available = true;
      PROVIDERS.bedrock.handler = callBedrockClaude;
      console.log(
        "[callLLM] Bedrock provider initialized with AWS credentials"
      );
    } catch (error) {
      console.warn(
        "[callLLM] Bedrock provider initialization failed:",
        error.message
      );
      PROVIDERS.bedrock.available = false;
    }
  } else {
    console.warn(
      "[callLLM] Bedrock provider not available: Missing AWS credentials"
    );
    PROVIDERS.bedrock.available = false;
  }

  // Set Ollama with Qwen 2.5 Coder 7B as default provider (optimal untuk M1 16GB)
  console.log(
    "[callLLM] Setting Ollama with Qwen 2.5 Coder 7B as default provider (M1 optimized)"
  );
  currentProvider = "ollama";
  if (!DEFAULT_MODEL) {
    DEFAULT_MODEL = PROVIDERS.ollama.defaultModel; // qwen3:30b
  }

  console.log(
    "[callLLM] Available providers:",
    Object.entries(PROVIDERS)
      .filter(([, config]) => config.available)
      .map(([name]) => name)
  );

  console.log("[callLLM] Current provider:", currentProvider);
  console.log(
    "[callLLM] Default model:",
    DEFAULT_MODEL || PROVIDERS[currentProvider]?.defaultModel
  );
}

/**
 * Universal LLM call function
 */
async function callLLM({
  prompt,
  system = "",
  temperature = 0.3,
  model = null,
  provider = null,
}) {
  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    throw new Error("Invalid prompt: must be a non-empty string");
  }

  const targetProvider = provider || currentProvider;
  if (!providerHandlers[targetProvider]) {
    throw new Error(
      `Provider '${targetProvider}' not available. Available providers: ${Object.keys(
        providerHandlers
      ).join(", ")}`
    );
  }

  const targetModel =
    model || DEFAULT_MODEL || PROVIDERS[targetProvider]?.defaultModel;
  console.log(
    `[callLLM] Using provider: ${targetProvider}, model: ${targetModel}`
  );

  try {
    const response = await providerHandlers[targetProvider]({
      prompt,
      system,
      temperature,
      model: targetModel,
    });

    if (!response || typeof response !== "string") {
      throw new Error("Invalid response from LLM provider");
    }

    return response.trim();
  } catch (error) {
    console.error(`[callLLM] ${targetProvider} call failed:`, error.message);

    // Try fallback to legacy Ollama model first (qwen3:30b)
    if (targetProvider === "ollama" && targetModel === "qwen3:14b") {
      console.log(`[callLLM] Attempting fallback to Qwen 2.5 Coder 7B...`);
      try {
        return await providerHandlers["ollama"]({
          prompt,
          system,
          temperature,
          model: "qwen3:30b",
        });
      } catch (fallbackError) {
        console.warn(
          `[callLLM] Fallback to Qwen 2.5 Coder also failed:`,
          fallbackError.message
        );
      }
    }

    // Try fallback to other available providers
    const fallbackProviders = Object.keys(providerHandlers).filter(
      (p) => p !== targetProvider
    );

    for (const fallbackProvider of fallbackProviders) {
      if (PROVIDERS[fallbackProvider]?.available) {
        console.log(`[callLLM] Attempting fallback to ${fallbackProvider}...`);
        try {
          return await providerHandlers[fallbackProvider]({
            prompt,
            system,
            temperature,
            model: PROVIDERS[fallbackProvider].defaultModel,
          });
        } catch (fallbackError) {
          console.warn(
            `[callLLM] Fallback to ${fallbackProvider} also failed:`,
            fallbackError.message
          );
          continue;
        }
      }
    }

    throw new Error(
      `All LLM providers failed. Primary error: ${error.message}. Please check your configuration.`
    );
  }
}

/**
 * Switch active provider
 */
function switchProvider(providerName) {
  if (!PROVIDERS[providerName]) {
    throw new Error(
      `Unknown provider: ${providerName}. Available: ${Object.keys(
        PROVIDERS
      ).join(", ")}`
    );
  }

  if (!PROVIDERS[providerName].available) {
    throw new Error(
      `Provider ${providerName} is not available. Check configuration.`
    );
  }

  currentProvider = providerName;
  console.log(`[callLLM] Switched to provider: ${providerName}`);
}

/**
 * Get available providers
 */
function getAvailableProviders() {
  return Object.entries(PROVIDERS)
    .filter(([name, config]) => config.available)
    .map(([name, config]) => ({
      name,
      description: config.description,
      defaultModel: config.defaultModel,
      isCurrent: name === currentProvider,
    }));
}

/**
 * Get current provider info
 */
function getCurrentProvider() {
  return {
    name: currentProvider,
    ...PROVIDERS[currentProvider],
    model: DEFAULT_MODEL,
  };
}

/**
 * Test provider connection
 */
async function testProvider(providerName = currentProvider) {
  if (!providerHandlers[providerName]) {
    throw new Error(`Provider ${providerName} not available`);
  }

  try {
    const testResponse = await providerHandlers[providerName]({
      prompt: 'Respond with just "OK" to confirm connection.',
      system: "You are testing the connection. Respond briefly.",
      temperature: 0.1,
      model: PROVIDERS[providerName].defaultModel,
    });

    return {
      success: true,
      provider: providerName,
      response: testResponse.substring(0, 100),
      model: PROVIDERS[providerName].defaultModel,
    };
  } catch (error) {
    return {
      success: false,
      provider: providerName,
      error: error.message,
    };
  }
}

// Initialize on module load
initializeProviders();

// =============================================================================
// PLAYWRIGHT PARSER
// =============================================================================

/**
 * Playwright Parser - Extracts and validates Playwright test code from LLM responses
 */
class PlaywrightParser {
  parse(response, options = {}) {
    try {
      const code = this._extractCode(response);
      const validation = this._validateCode(code);

      return {
        code,
        validation,
        metadata: {
          originalLength: response.length,
          codeLength: code.length,
          extractedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        code: this.generateFallbackTest(
          options.formAnalysis || {},
          options.testUrl || ""
        ),
        validation: { isValid: false, issues: [error.message], warnings: [] },
        metadata: { source: "fallback", error: error.message },
      };
    }
  }

  _extractCode(response) {
    // Remove markdown code blocks only
    let code = response
      .replace(/```javascript\n?/g, "")
      .replace(/```js\n?/g, "")
      .replace(/```\n?/g, "");

    // Find the start of actual test code
    const testStart =
      code.indexOf("const { test, expect }") !== -1
        ? code.indexOf("const { test, expect }")
        : code.indexOf("test(");

    if (testStart === -1) {
      throw new Error("No Playwright test code found");
    }

    // Extract from test start and trust the LLM to give clean code
    return code.substring(testStart).trim();
  }

  _validateCode(code) {
    const issues = [];
    const warnings = [];

    if (!code.includes("test(") && !code.includes("test.describe(")) {
      issues.push("No test functions found");
    }

    if (!code.includes("expect(")) {
      warnings.push("No assertions found");
    }

    if (!code.includes("page.")) {
      issues.push("No page interactions found");
    }

    if (!code.includes("await page.goto(")) {
      warnings.push("No page navigation found");
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
    };
  }

  generateFallbackTest(formAnalysis, testUrl) {
    const url = testUrl || "http://localhost:3000";

    return `const { test, expect } = require('@playwright/test');

test.describe('Form Tests', () => {
  test('Basic form interaction', async ({ page }) => {
    await page.goto('${url}');
    
    // Wait for form to load
    await page.waitForSelector('form', { timeout: 10000 });
    
    // Basic form submission test
    await page.click('button[type="submit"]');
    
    // Check for any response
    await page.waitForTimeout(1000);
  });
});`;
  }
}

// =============================================================================
// PROGRESS TRACKING
// =============================================================================

let progressState = {
  status: "Initializing...",
  prompt: "",
  timestamp: new Date().toISOString(),
  playwrightCode: undefined,
};

let progressCallbacks = [];

function updateProgress(updates) {
  progressState = {
    ...progressState,
    ...updates,
    timestamp: new Date().toISOString(),
  };

  // Format JSON output untuk terminal agar lebih rapi dan mudah dibaca
  console.log(`Progress updated:`);
  console.log(JSON.stringify(progressState, null, 2));
  console.log("---"); // separator untuk memudahkan pembacaan

  // Notify all registered callbacks
  progressCallbacks.forEach((callback) => {
    try {
      callback(progressState);
    } catch (error) {
      console.error("Progress callback error:", error);
    }
  });
}

function resetProgress() {
  progressState = {
    status: "Initializing...",
    prompt: "",
    timestamp: new Date().toISOString(),
    playwrightCode: undefined,
  };
}

function onProgressUpdate(callback) {
  progressCallbacks.push(callback);
  return () => {
    progressCallbacks = progressCallbacks.filter((cb) => cb !== callback);
  };
}

function getProgress() {
  return { ...progressState };
}

// =============================================================================
// TEST RUNNER
// =============================================================================

class TestRunner {
  constructor(options = {}) {
    this.timeout = options.timeout || 30000;
    this.retries = options.retries || 0;
  }

  async runTest(testFilePath, options = {}) {
    return new Promise((resolve, reject) => {
      const args = ["test", testFilePath];
      if (options.headed) args.push("--headed");
      if (options.debug) args.push("--debug");

      const child = spawn("npx", ["playwright", ...args], {
        cwd: process.cwd(),
        stdio: "pipe",
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve({ success: true, stdout, stderr });
        } else {
          reject(new Error(`Test failed with code ${code}: ${stderr}`));
        }
      });

      child.on("error", (error) => {
        reject(new Error(`Failed to start test: ${error.message}`));
      });
    });
  }
}

// =============================================================================
// FRAMEWORK HELPERS
// =============================================================================

function getDateForAge(ageYears, monthsOffset = 0, daysOffset = 0) {
  const now = new Date();
  const targetDate = new Date(
    now.getFullYear() - ageYears,
    now.getMonth() + monthsOffset,
    now.getDate() + daysOffset
  );
  return targetDate.toISOString().split("T")[0];
}

// =============================================================================
// TEST FILE MANAGER
// =============================================================================

class TestFileManager {
  constructor() {
    this.testsDir = path.join(process.cwd(), "tests");
    this.ensureTestsDir();
  }

  ensureTestsDir() {
    if (!fs.existsSync(this.testsDir)) {
      fs.mkdirSync(this.testsDir, { recursive: true });
      console.log(`📁 Created tests directory: ${this.testsDir}`);
    }
  }

  /**
   * Generate smart test filename based on description
   */
  generateTestFileName(description) {
    const keywords = [
      "dob",
      "date of birth",
      "tanggal lahir",
      "birth date",
      "login",
      "signin",
      "sign in",
      "auth",
      "authentication",
      "register",
      "signup",
      "sign up",
      "registration",
      "form",
      "validation",
      "submit",
      "policy",
      "search",
      "filter",
      "upload",
      "download",
      "payment",
      "checkout",
      "cart",
      "profile",
    ];

    const desc = description.toLowerCase();
    let filename = "test_auto";

    // Find matching keywords
    for (const keyword of keywords) {
      if (desc.includes(keyword)) {
        const cleanKeyword = keyword.replace(/\s+/g, "_");
        filename = `test_${cleanKeyword}`;
        break;
      }
    }

    // Add timestamp to avoid conflicts
    const timestamp = Date.now();
    return `${filename}_${timestamp}.spec.js`;
  }

  /**
   * Find existing tests based on description keywords
   */
  async findExistingTests(description) {
    try {
      const files = fs.readdirSync(this.testsDir);
      const testFiles = files.filter((f) => f.endsWith(".spec.js"));

      const keywords = [
        "dob",
        "date_of_birth",
        "tanggal_lahir",
        "birth_date",
        "login",
        "signin",
        "auth",
        "authentication",
        "register",
        "signup",
        "registration",
        "form",
        "validation",
        "policy",
      ];

      const desc = description.toLowerCase().replace(/\s+/g, "_");

      for (const keyword of keywords) {
        if (
          desc.includes(keyword.replace("_", " ")) ||
          desc.includes(keyword)
        ) {
          const matchingFiles = testFiles.filter((f) => f.includes(keyword));
          if (matchingFiles.length > 0) {
            // Return the most recent matching file
            const sortedFiles = matchingFiles.sort((a, b) => {
              const statA = fs.statSync(path.join(this.testsDir, a));
              const statB = fs.statSync(path.join(this.testsDir, b));
              return statB.mtime - statA.mtime;
            });

            return {
              found: true,
              filename: sortedFiles[0],
              fullPath: path.join(this.testsDir, sortedFiles[0]),
              keyword: keyword,
              allMatching: sortedFiles,
            };
          }
        }
      }

      return { found: false };
    } catch (error) {
      console.error("Error finding existing tests:", error.message);
      return { found: false, error: error.message };
    }
  }

  /**
   * Merge new test with existing test file
   */
  async mergeWithExistingTest(existingFilename, newTestCode, description) {
    try {
      const existingPath = path.join(this.testsDir, existingFilename);
      const existingCode = fs.readFileSync(existingPath, "utf8");

      // Extract test cases from new code
      const newTestMatches = newTestCode.match(/test\([^}]+\}\);/gs) || [];
      const newDescribeMatches =
        newTestCode.match(/test\.describe\([^}]+\}\);/gs) || [];

      // Add timestamp comment
      const timestamp = new Date().toISOString();
      const amendComment = `\n\n// === AMENDED ${timestamp} ===\n// Description: ${description}\n`;

      let mergedCode = existingCode;

      // Find the last closing brace of the main describe block
      const lastDescribeClosing = existingCode.lastIndexOf("});");

      if (lastDescribeClosing !== -1) {
        // Insert new tests before the last closing brace
        const beforeClosing = existingCode.substring(0, lastDescribeClosing);
        const afterClosing = existingCode.substring(lastDescribeClosing);

        mergedCode = beforeClosing + amendComment;

        // Add new test cases
        newTestMatches.forEach((testCase) => {
          mergedCode += `\n  ${testCase.trim()}\n`;
        });

        mergedCode += afterClosing;
      } else {
        // If no describe block found, append new tests
        mergedCode += amendComment + "\n" + newTestCode;
      }

      console.log(
        `🔄 Merged new tests into existing file: ${existingFilename}`
      );
      return mergedCode;
    } catch (error) {
      console.error("Error merging tests:", error.message);
      // If merge fails, return new code
      return newTestCode;
    }
  }

  /**
   * Write test file to disk
   */
  async writeTestFile(filename, code) {
    const filePath = path.join(this.testsDir, filename);
    fs.writeFileSync(filePath, code, "utf8");
    console.log(`📝 Test file written: ${filePath}`);
    return filePath;
  }

  /**
   * Check if Playwright is installed and npx is available
   */
  async checkPlaywrightInstalled() {
    try {
      // Check if @playwright/test is in node_modules
      const playwrightPath = path.join(
        process.cwd(),
        "node_modules",
        "@playwright",
        "test"
      );
      const playwrightInstalled = fs.existsSync(playwrightPath);

      if (!playwrightInstalled) {
        return {
          installed: false,
          error: "@playwright/test not found in node_modules",
        };
      }

      // Check if npx is available
      const npxAvailable = await this.checkNpxAvailable();
      if (!npxAvailable) {
        return {
          installed: true,
          npxAvailable: false,
          error:
            "npx command not found. Please ensure Node.js/npm is properly installed and in PATH.",
        };
      }

      return { installed: true, npxAvailable: true };
    } catch (error) {
      return { installed: false, error: error.message };
    }
  }

  /**
   * Check if npx command is available
   */
  async checkNpxAvailable() {
    return new Promise((resolve) => {
      console.log("🔍 Checking npx availability...");

      const child = spawn("npx", ["--version"], {
        stdio: "pipe",
        shell: process.platform === "win32",
      });

      child.on("close", (code) => {
        console.log(`📋 npx check result: exit code ${code}`);
        resolve(code === 0);
      });

      child.on("error", (error) => {
        console.log(`❌ npx check error: ${error.message}`);
        resolve(false);
      });

      // Timeout after 3 seconds (reduced from 5)
      setTimeout(() => {
        console.log("⏰ npx check timeout");
        child.kill();
        resolve(false);
      }, 3000);
    });
  }

  /**
   * Run Playwright test and return results
   */
  async runTest(testFilePath, options = {}) {
    const { headless = true, timeout = 30000 } = options;

    // Try multiple execution methods
    const executionMethods = [
      // Method 1: npx playwright
      () => this._runWithNpx(testFilePath, { headless, timeout }),
      // Method 2: Direct node execution
      () => this._runWithNode(testFilePath, { headless, timeout }),
      // Method 3: npm script if available
      () => this._runWithNpm(testFilePath, { headless, timeout }),
    ];

    for (let i = 0; i < executionMethods.length; i++) {
      try {
        console.log(`🎭 Attempting execution method ${i + 1}...`);
        const result = await executionMethods[i]();
        if (result.success || result.exitCode !== undefined) {
          return result;
        }
      } catch (error) {
        console.warn(`❌ Execution method ${i + 1} failed:`, error.message);
        if (i === executionMethods.length - 1) {
          // Last method failed, return detailed error
          return {
            success: false,
            error: `All execution methods failed. Last error: ${error.message}`,
            suggestions: [
              "Ensure Node.js/npm is installed and in PATH",
              "Run: npm install @playwright/test",
              "Run: npx playwright install",
              "Check if playwright command works: npx playwright --version",
            ],
          };
        }
      }
    }
  }

  /**
   * Run test using npx playwright
   */
  async _runWithNpx(testFilePath, { headless, timeout }) {
    return new Promise((resolve, reject) => {
      const args = ["test", testFilePath];
      if (headless) args.push("--headed=false");
      args.push("--reporter=json");

      console.log(`🎭 Running: npx playwright ${args.join(" ")}`);

      const child = spawn("npx", ["playwright", ...args], {
        cwd: process.cwd(),
        stdio: "pipe",
        shell: process.platform === "win32", // Use shell on Windows
      });

      this._handleChildProcess(child, resolve, reject, timeout);
    });
  }

  /**
   * Run test using direct node execution
   */
  async _runWithNode(testFilePath, { headless, timeout }) {
    return new Promise((resolve, reject) => {
      // Try to find playwright binary directly
      const playwrightBin = path.join(
        process.cwd(),
        "node_modules",
        ".bin",
        "playwright"
      );
      const playwrightCmd =
        process.platform === "win32" ? `${playwrightBin}.cmd` : playwrightBin;

      if (!fs.existsSync(playwrightCmd)) {
        reject(new Error("Playwright binary not found"));
        return;
      }

      const args = ["test", testFilePath];
      if (headless) args.push("--headed=false");
      args.push("--reporter=json");

      console.log(`🎭 Running: ${playwrightCmd} ${args.join(" ")}`);

      const child = spawn(playwrightCmd, args, {
        cwd: process.cwd(),
        stdio: "pipe",
        shell: process.platform === "win32",
      });

      this._handleChildProcess(child, resolve, reject, timeout);
    });
  }

  /**
   * Run test using npm script
   */
  async _runWithNpm(testFilePath, { headless, timeout }) {
    return new Promise((resolve, reject) => {
      // Check if there's a test script in package.json
      try {
        const packagePath = path.join(process.cwd(), "package.json");
        if (!fs.existsSync(packagePath)) {
          reject(new Error("package.json not found"));
          return;
        }

        const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
        if (!packageJson.scripts || !packageJson.scripts.test) {
          reject(new Error("No test script found in package.json"));
          return;
        }

        console.log(`🎭 Running: npm test ${testFilePath}`);

        const child = spawn("npm", ["test", testFilePath], {
          cwd: process.cwd(),
          stdio: "pipe",
          shell: process.platform === "win32",
        });

        this._handleChildProcess(child, resolve, reject, timeout);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle child process output and cleanup
   */
  _handleChildProcess(child, resolve, reject, timeout) {
    let stdout = "";
    let stderr = "";
    let isResolved = false;

    child.stdout.on("data", (data) => {
      stdout += data.toString();
      console.log(
        "📤 Test output chunk received:",
        data.toString().substring(0, 100)
      );
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
      console.log("📤 Test stderr chunk:", data.toString().substring(0, 100));
    });

    child.on("close", (code) => {
      if (isResolved) return;
      isResolved = true;

      console.log(`📊 Test process closed with code: ${code}`);
      console.log(
        `📊 stdout length: ${stdout.length}, stderr length: ${stderr.length}`
      );

      try {
        const results = this.parsePlaywrightResults(stdout, stderr, code);
        resolve(results);
      } catch (error) {
        resolve({
          success: false,
          error: error.message,
          stdout: stdout.substring(0, 1000),
          stderr: stderr.substring(0, 1000),
          exitCode: code,
        });
      }
    });

    child.on("error", (error) => {
      if (isResolved) return;
      isResolved = true;
      console.log("❌ Test process error:", error.message);
      reject(new Error(`Failed to start process: ${error.message}`));
    });

    // Set timeout
    const timeoutId = setTimeout(() => {
      if (isResolved) return;
      isResolved = true;

      console.log(`⏰ Test execution timeout after ${timeout}ms`);
      child.kill("SIGTERM");

      // Give it 2 seconds to cleanup, then force kill
      setTimeout(() => {
        if (!child.killed) {
          console.log("🔪 Force killing test process");
          child.kill("SIGKILL");
        }
      }, 2000);

      resolve({
        success: false,
        error: `Test execution timed out after ${timeout}ms`,
        stdout: stdout.substring(0, 1000),
        stderr: stderr.substring(0, 1000),
        exitCode: -1,
        timedOut: true,
      });
    }, timeout);

    // Clear timeout when process ends
    child.on("close", () => {
      clearTimeout(timeoutId);
    });
  }

  /**
   * Parse Playwright test results
   */
  parsePlaywrightResults(stdout, stderr, exitCode) {
    console.log("🔍 Parsing test results...");
    console.log("📋 Exit code:", exitCode);

    // Handle empty output
    if (!stdout || stdout.trim() === "") {
      console.log("⚠️ Empty stdout, checking stderr...");
      return {
        success: false,
        exitCode,
        error: "No test output received",
        stderr: stderr.substring(0, 500),
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        tests: [],
        summary: [
          "❌ No test output received",
          "• This could indicate:",
          "  - Test server not running",
          "  - Invalid selectors in test",
          "  - Browser launch failed",
        ],
      };
    }

    try {
      // Try to parse JSON output first
      const jsonMatch = stdout.match(/\{.*\}/s);
      if (jsonMatch) {
        console.log("📊 Found JSON output, parsing...");
        const results = JSON.parse(jsonMatch[0]);
        return this.formatPlaywrightResults(results, exitCode);
      }
    } catch (e) {
      console.log("⚠️ JSON parsing failed, falling back to text parsing");
    }

    // Fallback: parse text output
    const lines = stdout.split("\n");
    const testResults = [];

    for (const line of lines) {
      if (
        line.includes("✓") ||
        line.includes("✗") ||
        line.includes("×") ||
        line.includes("passed") ||
        line.includes("failed")
      ) {
        const passed = line.includes("✓") || line.includes("passed");
        const testName = line.replace(/[✓✗×\s\d]+/, "").trim();

        if (testName) {
          testResults.push({
            title: testName,
            passed: passed,
            failed: !passed,
            duration: 0,
            error: passed ? null : "Test failed",
          });
        }
      }
    }

    const result = {
      success: exitCode === 0 && testResults.length > 0,
      exitCode,
      totalTests: testResults.length,
      passedTests: testResults.filter((t) => t.passed).length,
      failedTests: testResults.filter((t) => t.failed).length,
      tests: testResults,
      summary: this.generateTestSummary(testResults),
      stdout: stdout.substring(0, 1000),
      stderr: stderr.substring(0, 1000),
    };

    console.log("📊 Parsed result:", {
      success: result.success,
      totalTests: result.totalTests,
      passed: result.passedTests,
      failed: result.failedTests,
    });

    return result;
  }

  /**
   * Format Playwright JSON results
   */
  formatPlaywrightResults(results, exitCode) {
    const tests = [];
    const suites = results.suites || [];

    const extractTests = (suite) => {
      if (suite.tests) {
        suite.tests.forEach((test) => {
          tests.push({
            title: test.title,
            passed: test.outcome === "passed",
            failed: test.outcome === "failed",
            skipped: test.outcome === "skipped",
            duration: test.results?.[0]?.duration || 0,
            error: test.results?.[0]?.error?.message || null,
          });
        });
      }
      if (suite.suites) {
        suite.suites.forEach(extractTests);
      }
    };

    suites.forEach(extractTests);

    const passedTests = tests.filter((t) => t.passed).length;
    const failedTests = tests.filter((t) => t.failed).length;

    return {
      success: exitCode === 0 && failedTests === 0,
      exitCode,
      totalTests: tests.length,
      passedTests,
      failedTests,
      tests,
      summary: this.generateTestSummary(tests),
      duration: results.stats?.duration || 0,
    };
  }

  /**
   * Generate bullet point summary of test results
   */
  generateTestSummary(tests) {
    const summary = [];

    summary.push(`📊 **Test Results Summary**`);
    summary.push(`• Total Tests: ${tests.length}`);
    summary.push(`• ✅ Passed: ${tests.filter((t) => t.passed).length}`);
    summary.push(`• ❌ Failed: ${tests.filter((t) => t.failed).length}`);
    summary.push(`• ⏭️ Skipped: ${tests.filter((t) => t.skipped).length}`);
    summary.push("");

    if (tests.length > 0) {
      summary.push("📋 **Individual Test Results**");
      tests.forEach((test) => {
        const status = test.passed ? "✅" : test.failed ? "❌" : "⏭️";
        const duration = test.duration ? ` (${test.duration}ms)` : "";
        summary.push(`• ${status} ${test.title}${duration}`);

        if (test.error) {
          summary.push(`  └─ Error: ${test.error}`);
        }
      });
    }

    return summary;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

// LLM exports
callLLM.switchProvider = switchProvider;
callLLM.getAvailableProviders = getAvailableProviders;
callLLM.getCurrentProvider = getCurrentProvider;
callLLM.testProvider = testProvider;
callLLM.PROVIDERS = PROVIDERS;

module.exports = {
  // LLM functions
  callLLM,
  switchProvider,
  getAvailableProviders,
  getCurrentProvider,
  testProvider,
  initializeProviders,
  PROVIDERS,

  // Parser
  PlaywrightParser,

  // Progress tracking
  updateProgress,
  resetProgress,
  onProgressUpdate,
  getProgress,

  // Test runner
  TestRunner,

  // Test file management
  TestFileManager,

  // Helpers
  getDateForAge,
};
