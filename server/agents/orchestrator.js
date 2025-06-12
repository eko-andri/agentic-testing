const promptEngineer = require("./promptEngineer");
const criticAgent = require("./criticAgent");
const { contextAgent } = require("./contextAgent");
const { analyzeFormContext } = require("./formContextAnalyzer");
const { testGenerator, generateTestCode } = require("./testGenerator");
const { runPlaywrightTest } = require("./testRunner");
const fs = require("fs");
const path = require("path");
const {
  getRequirementFileName,
  loadRequirementHistory,
  saveRequirementHistory,
  isSameRequirement,
} = require("./utils/requirementHistory");
// Untuk update status progress dari orchestrator
const { setCurrentProgress } = require("./utils/progressStatus");

async function orchestrateTestPlan({
  description,
  howToReproduce,
  acceptanceCriteria,
  testUrl,
  extras = [],
  maxRetries = 3,
  ticketNumber = "auto",
  ticketType = "dob",
}) {
  let testPlan = "";
  let testPlanFeedback = "";
  let attempts = 0;
  let improvedPromptSuffix = "";
  setCurrentProgress("Reading requirements...");
  console.log("[Progress] Reading requirements..."); // 0. Context Analysis - cek kelengkapan requirement sebelum proses
  let contextIncomplete = false;
  try {
    const contextAnalysis = await contextAgent(description, acceptanceCriteria);
    if (!contextAnalysis.isComplete) {
      contextIncomplete = true;
      console.log(
        "[Progress] Context incomplete, will try form context analyzer..."
      );
    }
  } catch (err) {
    console.error("[ERROR] Context analysis failed:", err);
    // Jika context agent gagal, lanjutkan proses normal
  }
  // 0.5. Form Context Analysis - analisa struktur form dari URL
  let formContext = null;
  try {
    setCurrentProgress(
      "Form Context Analyzer:\nAnalyzing form structure from URL..."
    );
    console.log("[Progress] Analyzing form structure from URL:", testUrl);
    formContext = await analyzeFormContext(testUrl);
    setCurrentProgress(
      "Form Context Analyzer:\nForm structure analysis complete."
    );
    console.log("[Progress] Form context extracted:", formContext);

    // Jika context was incomplete tapi form analyzer berhasil, evaluasi ulang
    if (
      contextIncomplete &&
      formContext &&
      formContext.fields &&
      Object.keys(formContext.fields).length > 0
    ) {
      setCurrentProgress(
        "Form Context Analyzer:\nForm analysis provided missing context - proceeding..."
      );
      console.log(
        "[Progress] Form analyzer compensated for incomplete context"
      );
      contextIncomplete = false; // Override context incomplete status
    }
  } catch (err) {
    console.error("[ERROR] Form context analysis failed:", err);
    setCurrentProgress(
      "Form Context Analyzer:\nWarning: Could not analyze form structure."
    );
    // Jika form analyzer gagal, lanjutkan tanpa form context
  }

  // Jika masih incomplete setelah form analyzer, kembalikan error ke user
  if (contextIncomplete) {
    return {
      success: false,
      error: "Incomplete requirement context",
      message:
        "Please provide more specific details about date formats and form selectors, or ensure the URL contains a valid form structure.",
      requiresUserInput: true,
    };
  }

  // 1. Cek history requirement
  const history = loadRequirementHistory(ticketType);
  const currentReq = { description, acceptanceCriteria };
  const found = history.find((h) => isSameRequirement(h, currentReq));

  if (found) {
    setCurrentProgress("Looking for past tests with the same requirements...");
    console.log("[Progress] Found duplicate requirement, rerunning test...");
    // Sudah ada requirement yang sama, jalankan ulang test lama
    const playwrightFileName = found.testFile;
    const playwrightFilePath = path.join(
      __dirname,
      "../tests",
      playwrightFileName
    );
    const outputJsonPath = path.join(
      __dirname,
      "../tests",
      `result_${ticketNumber || Date.now()}.json`
    );
    let testResult = null;
    setCurrentProgress("Running Playwright test for duplicate requirement...");
    try {
      testResult = await runPlaywrightTest(playwrightFilePath, outputJsonPath);
      setCurrentProgress("Done.");
      console.log("[Progress] Playwright test done for duplicate requirement.");
    } catch (err) {
      testResult = { error: err };
      setCurrentProgress(
        "Error running Playwright test for duplicate requirement."
      );
      console.error(
        "[Error] Playwright test failed for duplicate requirement:",
        err
      );
    }
    return {
      success: true,
      attempts: 0,
      testPlan: found.testPlan,
      testPlanFeedback: found.testPlanFeedback,
      final: true,
      testFile: playwrightFileName,
      testResult,
      message: "Requirement already exists. Only rerun the test.",
    };
  }

  // 2. Jika requirement berbeda, generate test baru dan simpan history
  while (attempts < maxRetries) {
    attempts++;
    setCurrentProgress(
      `Generating new test plan (attempt ${attempts}/${maxRetries})...`
    );
    console.log(
      `[Progress] Generating new test plan (attempt ${attempts}/${maxRetries})...`
    );
    try {
      // Logging prompt ke promptEngineer
      console.log(
        "[LOG] Prompt to promptEngineer:\n",
        description + improvedPromptSuffix
      );
      setCurrentProgress("Running Prompt Engineer Agent agent...");
      testPlan = await promptEngineer(
        description + improvedPromptSuffix,
        extras,
        howToReproduce,
        acceptanceCriteria,
        formContext // Hanya gunakan form context, tidak perlu extracted context lagi
      );
      // Logging prompt ke criticAgent
      console.log("[LOG] Prompt to criticAgent:\n", testPlan);
      setCurrentProgress("Running critic agent for test plan...");
      testPlanFeedback = await criticAgent(testPlan);
    } catch (err) {
      // Jangan update progress di sini, biarkan agent yang update status error
      console.error(
        "[Error] Failed to generate test plan or run critic agent:",
        err
      );
      return {
        success: false,
        attempts,
        testPlan,
        testPlanFeedback,
        final: false,
        message: `Error: ${err}`,
      };
    }
    if (testPlanFeedback.includes("✅ PASS")) {
      // Jangan update progress di sini, biarkan agent testGenerator yang update status
      let playwrightCode;
      try {
        // Logging prompt ke testGenerator
        console.log("[LOG] Prompt to testGenerator:\n", testPlan);
        playwrightCode = await testGenerator(
          testPlan,
          testUrl,
          formContext // Hanya gunakan form context
        );
        return {
          success: true,
          attempts,
          testPlan,
          testPlanFeedback,
          final: true,
          playwrightCode, // tampilkan kode Playwright hasil agent ke UI
          resultType: "playwrightCode", // tambahkan tipe hasil
          message:
            "Berikut adalah hasil kode Playwright dari agent testGenerator.",
        };
      } catch (err) {
        // Jangan update progress di sini, biarkan agent testGenerator yang update status error
        console.error("[Error] Failed to generate Playwright code:", err);
        return {
          success: false,
          attempts,
          testPlan,
          testPlanFeedback,
          final: false,
          message: `Error: ${err}`,
        };
      }
    }
    console.log(`🔁 Feedback: ${testPlanFeedback}`);

    // Generate feedback suffix to refine prompt
    const suggestedFixes = testPlanFeedback
      .split("\n")
      .filter((line) => line.startsWith("-") || line.startsWith("•"))
      .join("; ");

    improvedPromptSuffix = `\n\nAlso consider edge cases such as: ${suggestedFixes}`;
  }

  // Reached max retries, return last version
  setCurrentProgress("Max retries reached. Please review feedback.");
  console.log("[Progress] Max retries reached. Please review feedback.");
  return {
    success: false,
    attempts,
    testPlan,
    testPlanFeedback,
    final: false,
    message: `Exceeded maximum retry attempts (${maxRetries}). Please review feedback.`,
  };
}

module.exports = orchestrateTestPlan;
