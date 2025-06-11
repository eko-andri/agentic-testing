const { writeFileSync, mkdirSync, existsSync } = require("fs");
const { execSync, exec } = require("child_process");
const path = require("path");

async function testRunner(testCode, appName = "myapp") {
  const testDir = path.join(__dirname, "../e2e");
  if (!existsSync(testDir)) mkdirSync(testDir);
  const fileName = `${appName}-${Date.now()}.spec.js`;
  const filePath = path.join(testDir, fileName);

  writeFileSync(filePath, testCode, "utf8");

  let result = { success: false, output: "" };
  try {
    // Run Playwright test with headed mode for debugging
    const output = execSync(`npx playwright test ${filePath} --headed`, {
      encoding: "utf8",
      timeout: 90_000,
    });
    result = { success: true, output };
  } catch (e) {
    result = { success: false, output: e.stdout || e.message };
  }
  return { ...result, filePath };
}

async function runPlaywrightTest(testFilePath, outputJsonPath) {
  return new Promise((resolve, reject) => {
    // Jalankan Playwright dengan reporter JSON
    const cmd = `npx playwright test ${testFilePath} --reporter=json --output=${path.dirname(
      outputJsonPath
    )}`;
    exec(
      cmd,
      { cwd: path.resolve(__dirname, "../..") },
      (error, stdout, stderr) => {
        if (error) {
          return reject(stderr || error.message);
        }
        // Cari file .json terbaru di output
        const reportFiles = fs
          .readdirSync(path.dirname(outputJsonPath))
          .filter((f) => f.endsWith(".json"));
        if (reportFiles.length === 0) return reject("No JSON report found.");
        const reportFile = reportFiles
          .map((f) => ({
            name: f,
            time: fs
              .statSync(path.join(path.dirname(outputJsonPath), f))
              .mtime.getTime(),
          }))
          .sort((a, b) => b.time - a.time)[0].name;
        const reportData = fs.readFileSync(
          path.join(path.dirname(outputJsonPath), reportFile),
          "utf8"
        );
        resolve(JSON.parse(reportData));
      }
    );
  });
}

module.exports = { testRunner, runPlaywrightTest };
