const { writeFileSync, mkdirSync, existsSync } = require("fs");
const { execSync } = require("child_process");
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

module.exports = testRunner;
