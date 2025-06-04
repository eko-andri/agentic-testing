const { appendFileSync } = require("fs");
const path = require("path");

async function docAgent(testPlan, testResult, meta = {}) {
  const logDir = path.join(__dirname, "../logs");
  const fileName = `test-report-${Date.now()}.md`;
  const filePath = path.join(logDir, fileName);

  const md = [
    `# E2E Test Report`,
    `- **Timestamp:** ${new Date().toISOString()}`,
    `- **Test Plan:**\n${testPlan}`,
    `- **Result:** ${testResult.success ? "PASS" : "FAIL"}`,
    `- **Output:**\n${testResult.output}`,
    meta.filePath ? `- **Test File:** ${meta.filePath}` : "",
    "",
  ].join("\n");

  appendFileSync(filePath, md, "utf8");
  return filePath;
}

module.exports = docAgent;
