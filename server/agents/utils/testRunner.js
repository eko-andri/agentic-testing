const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { updateProgress } = require("./progressStatus");

class TestRunner {
  constructor() {
    this.testFileName = "test_auto.spec.js";
    this.testDir = path.resolve(__dirname, "../../tests");
    this.testFilePath = path.join(this.testDir, this.testFileName);
  }

  async runTestCode(code) {
    try {
      fs.mkdirSync(this.testDir, { recursive: true });
      fs.writeFileSync(this.testFilePath, code);
      updateProgress({
        status:
          "📄 Test Runner\nTest file written to server/tests/test_auto.spec.js",
        prompt: code,
      });
    } catch (fileError) {
      updateProgress({
        status: "❌ Test Runner\nFailed to write test file",
        prompt: fileError.message,
      });
      return {
        passed: [],
        failed: [{ title: "Test write failure", error: fileError.message }],
      };
    }

    return new Promise((resolve) => {
      updateProgress({ status: "▶️ Test Runner\nRunning Playwright test..." });

      // ✅ Run with relative path from cwd = server/
      exec(
        `npx playwright test tests/${this.testFileName} --reporter=json`,
        {
          cwd: path.resolve(__dirname, "../../"), // server/
          timeout: 15000,
        },
        (err, stdout, stderr) => {
          if (err) {
            updateProgress({
              status: "⚠️ Test Runner\nPlaywright execution error",
              prompt: stderr || stdout || err.message,
            });
          }

          let result = { passed: [], failed: [] };

          try {
            const report = JSON.parse(stdout);
            const specs = report.suites?.[0]?.specs || [];

            for (const spec of specs) {
              for (const test of spec.tests || []) {
                const title = spec.title || "Unnamed Test";
                if (test.status === "passed") {
                  result.passed.push(title);
                } else {
                  result.failed.push({
                    title,
                    error: test.errors?.[0]?.message || "Unknown failure",
                  });
                }
              }
            }

            updateProgress({
              status: "✅ Test Runner\nTest execution completed",
              prompt: `Passed: ${result.passed.length}, Failed: ${result.failed.length}`,
            });
          } catch (parseErr) {
            updateProgress({
              status: "❌ Test Runner\nFailed to parse test output",
              prompt: parseErr.message,
            });
            result.failed.push({
              title: "Parsing Error",
              error: parseErr.message,
            });
          }

          resolve(result);
        }
      );
    });
  }
}

module.exports = {
  TestRunner,
};
