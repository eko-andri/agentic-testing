/**
 * CONSOLIDATED UTILITIES - REFACTORED
 * Simplified utilities with modular provider system
 * Now uses providers/ directory for scalable LLM management
 */

const { providerManager } = require("./providers");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

// =============================================================================
// LLM INTERFACE - SIMPLIFIED
// =============================================================================

/**
 * Universal LLM call function - now delegates to ProviderManager
 */
async function callLLM({
  prompt,
  system = "",
  temperature = 0.3,
  model = null,
  provider = null,
}) {
  return await providerManager.call({
    prompt,
    system,
    temperature,
    model,
    provider,
  });
}

/**
 * Initialize all providers
 */
async function initializeProviders() {
  return await providerManager.initialize();
}

/**
 * Switch active provider
 */
async function switchProvider(providerName) {
  return await providerManager.switchProvider(providerName);
}

/**
 * Get available providers
 */
function getAvailableProviders() {
  return providerManager.getAvailableProviders();
}

/**
 * Get current provider info
 */
function getCurrentProvider() {
  return providerManager.getCurrentProvider();
}

/**
 * Test provider connection
 */
async function testProvider(providerName = null) {
  if (providerName) {
    return await providerManager.testProvider(providerName);
  }
  return await providerManager.healthCheck();
}

/**
 * Legacy compatibility - check Ollama availability
 */
async function checkOllamaAvailability() {
  const providers = providerManager.getAvailableProviders();
  const ollama = providers.find((p) => p.name === "Ollama Local");

  if (ollama) {
    return { available: true, reason: "Ollama is available" };
  }

  return { available: false, reason: "Ollama not initialized or not running" };
}

/**
 * Show Ollama setup prompt (legacy compatibility)
 */
async function promptOllamaSetup() {
  console.log("\n" + "=".repeat(60));
  console.log("🤖 OLLAMA FALLBACK SETUP");
  console.log("=".repeat(60));
  console.log("For reliable fallback, please install Ollama:");
  console.log("");
  console.log("📋 Quick setup:");
  console.log("   1. Install: https://ollama.com/download");
  console.log("   2. Pull model: ollama pull qwen3:8b");
  console.log("   3. Start: ollama serve");
  console.log("");
  console.log("💡 System will continue with available cloud providers.");
  console.log("=".repeat(60));
}

/**
 * Auto-install Ollama model (legacy compatibility)
 */
async function autoInstallOllamaModel(modelName) {
  const providers = providerManager.getAvailableProviders();
  const ollama = providers.find((p) => p.name === "Ollama Local");

  if (ollama) {
    try {
      const provider = providerManager.providers.get("ollama");
      return await provider.installModel(modelName);
    } catch (error) {
      console.warn(`Failed to auto-install model ${modelName}:`, error.message);
      return false;
    }
  }

  return false;
}

// Legacy PROVIDERS object for backward compatibility
const PROVIDERS = {
  groq: {
    name: "Groq Cloud",
    defaultModel: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    description: "Groq Cloud API with high-speed inference",
  },
  openai: {
    name: "OpenAI",
    defaultModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
    description: "OpenAI GPT models",
  },
  anthropic: {
    name: "Anthropic Claude",
    defaultModel: process.env.ANTHROPIC_MODEL || "claude-3-haiku-20240307",
    description: "Anthropic Claude models",
  },
  ollama: {
    name: "Ollama Local",
    defaultModel: process.env.OLLAMA_MODEL || "qwen3:8b",
    description: "Local Ollama server (fallback)",
  },
  bedrock: {
    name: "AWS Bedrock",
    defaultModel:
      process.env.BEDROCK_MODEL || "us.anthropic.claude-3-haiku-20240307-v1:0",
    description: "AWS Bedrock managed models",
  },
};

// =============================================================================
// PLAYWRIGHT PARSER
// =============================================================================

/**
 * Playwright Parser - Optimized for Playwright TypeScript code generation
 */
class PlaywrightParser {
  parse(response, options = {}) {
    try {
      const code = this._extractPlaywrightCode(response);
      const validation = this._validatePlaywrightCode(code);

      return {
        code,
        validation,
        metadata: {
          originalLength: response.length,
          codeLength: code.length,
          extractedAt: new Date().toISOString(),
          framework: "playwright",
          language: this._detectLanguage(code),
        },
      };
    } catch (error) {
      return {
        code: this.generatePlaywrightFallbackTest(
          options.formAnalysis || {},
          options.testUrl || ""
        ),
        validation: { isValid: false, issues: [error.message], warnings: [] },
        metadata: {
          source: "fallback",
          error: error.message,
          framework: "playwright",
        },
      };
    }
  }

  _extractPlaywrightCode(response) {
    // Remove markdown code blocks and explanatory text
    let code = response
      .replace(/```typescript\n?/g, "")
      .replace(/```javascript\n?/g, "")
      .replace(/```ts\n?/g, "")
      .replace(/```js\n?/g, "")
      .replace(/```\n?/g, "");

    // Find Playwright-specific imports
    const playwrightImportPatterns = [
      /import\s+.*from\s+['"]@playwright\/test['"]/,
      /const\s+{\s*test,\s*expect\s*}\s*=\s*require\(['"]@playwright\/test['"]\)/,
      /import\s+{\s*test,\s*expect.*}\s+from\s+['"]@playwright\/test['"]/,
    ];

    let testStart = -1;
    for (const pattern of playwrightImportPatterns) {
      const match = code.search(pattern);
      if (match !== -1) {
        testStart = match;
        break;
      }
    }

    // If no Playwright imports found, look for test functions
    if (testStart === -1) {
      testStart = code.search(/test\s*\(|test\.describe\s*\(/);
    }

    if (testStart === -1) {
      throw new Error("No Playwright test code found");
    }

    // Extract from test start and clean up
    return code.substring(testStart).trim();
  }

  _detectLanguage(code) {
    // Check for TypeScript-specific patterns
    if (
      code.includes("import") &&
      code.includes("from") &&
      (code.includes(": Page") ||
        code.includes(": Locator") ||
        code.includes("interface "))
    ) {
      return "typescript";
    }
    if (code.includes("require(") && code.includes("@playwright/test")) {
      return "javascript";
    }
    return "typescript"; // Default to TypeScript for Playwright
  }

  _validatePlaywrightCode(code) {
    const issues = [];
    const warnings = [];

    // Essential Playwright patterns
    if (!code.includes("@playwright/test")) {
      issues.push("Missing @playwright/test import");
    }

    if (!code.includes("test(") && !code.includes("test.describe(")) {
      issues.push("No Playwright test functions found");
    }

    if (!code.includes("expect(")) {
      warnings.push(
        "No assertions found - tests should include expect() statements"
      );
    }

    if (!code.includes("page.")) {
      issues.push(
        "No page interactions found - Playwright tests need page object usage"
      );
    }

    // Modern Playwright patterns
    if (!code.includes("page.goto(") && !code.includes("await page.goto(")) {
      warnings.push("No page navigation found - consider adding page.goto()");
    }

    if (!code.includes("page.locator(")) {
      warnings.push("Modern locator() method preferred over legacy selectors");
    }

    // TypeScript specific validations
    if (this._detectLanguage(code) === "typescript") {
      if (!code.includes("Page") || !code.includes("Locator")) {
        warnings.push("Consider using proper TypeScript types (Page, Locator)");
      }
    }

    // Page Object Model pattern detection
    if (code.includes("class ") && code.includes("Page")) {
      if (
        !code.includes("constructor(page: Page)") &&
        !code.includes("constructor(page)")
      ) {
        warnings.push(
          "Page Object Model classes should have proper constructor"
        );
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
    };
  }

  generatePlaywrightFallbackTest(formAnalysis, testUrl) {
    const url = testUrl || "http://localhost:3000";
    const fields = formAnalysis.formFields || [];

    // Generate TypeScript fallback with modern Playwright patterns
    const fieldSelectors = fields
      .map((field) => `    readonly ${field.name}Field: Locator;`)
      .join("\n");

    const fieldAssignments = fields
      .map(
        (field) =>
          `    this.${field.name}Field = page.locator('#${field.name}');`
      )
      .join("\n");

    const fieldTests = fields
      .map(
        (field) =>
          `  test('should validate ${field.name} field', async ({ page }) => {
    const formPage = new FormPage(page);
    await formPage.goto();
    
    // Test ${field.name} validation
    await formPage.${field.name}Field.fill('');
    await formPage.submitForm();
    
    // Check for validation error
    await expect(page.locator('#${field.name}-error')).toBeVisible();
  });`
      )
      .join("\n\n");

    return `import { test, expect, Page, Locator } from '@playwright/test';

class FormPage {
  readonly page: Page;
  readonly submitButton: Locator;
${fieldSelectors}

  constructor(page: Page) {
    this.page = page;
    this.submitButton = page.locator('button[type="submit"]');
${fieldAssignments}
  }

  async goto(): Promise<void> {
    await this.page.goto('${url}');
  }

  async submitForm(): Promise<void> {
    await this.submitButton.click();
  }
}

test.describe('Form Validation Tests', () => {
  test('should load form successfully', async ({ page }) => {
    const formPage = new FormPage(page);
    await formPage.goto();
    
    await expect(page.locator('form')).toBeVisible();
    await expect(formPage.submitButton).toBeVisible();
  });

${
  fieldTests ||
  `  test('should submit valid form', async ({ page }) => {
    const formPage = new FormPage(page);
    await formPage.goto();
    await formPage.submitForm();
    
    // Add specific validation based on your form behavior
    await expect(page).toHaveURL(/success|thank|confirm/);
  });`
}
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

module.exports = {
  // LLM functions - now using modular provider system
  callLLM,
  switchProvider,
  getAvailableProviders,
  getCurrentProvider,
  testProvider,
  initializeProviders,
  checkOllamaAvailability,
  promptOllamaSetup,
  autoInstallOllamaModel,
  PROVIDERS, // Legacy compatibility

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

  // Provider Manager (for advanced usage)
  providerManager,
};
