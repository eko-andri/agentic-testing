/**
 * Test Improved Test Code Generator
 * Verifies that the updated prompts generate modern Playwright code
 */

const { Orchestrator } = require("../orchestrator");

async function testImprovedTestGenerator() {
  console.log("🧪 Testing Improved Test Code Generator");
  console.log("======================================");

  try {
    console.log("Creating orchestrator with Live UI analysis...");

    const orchestrator = new Orchestrator({
      description:
        "Customer wants a policy holder date of birth is start from 16 years",
      acceptanceCriteria:
        "1. DOB minimum is 16 instead of 18\n2. previous validation should still work (dob field only accept date, dob is required, can not be empty)",
      testUrl: "http://127.0.0.1:5500/policy-form.html",
      analysisMethod: "live-ui",
    });

    console.log("\n🚀 Generating test with improved prompts...");
    console.log("Expected improvements:");
    console.log("✅ Uses page.locator() instead of waitForSelector()");
    console.log("✅ Uses fill('') instead of clear()");
    console.log("✅ Uses proper Locator-based assertions");
    console.log("✅ Calculates dates correctly (16 years ago)");
    console.log("✅ Checks error message visibility properly");

    // This will use the improved prompts
    const result = await orchestrator.run();

    console.log("\n✅ Test generation completed!");

    // Analyze the generated code
    if (result && result.code) {
      const code = result.code;

      console.log("\n📊 Code Analysis:");
      console.log("==================");

      // Check for modern practices
      const hasLocator = code.includes("page.locator(");
      const hasWaitForSelector = code.includes("waitForSelector");
      const hasClearMethod = code.includes(".clear()");
      const hasFillEmpty = code.includes("fill('')");
      const hasToBeVisible = code.includes("toBeVisible()");

      console.log(`✅ Uses page.locator(): ${hasLocator ? "YES" : "NO"}`);
      console.log(
        `❌ Uses deprecated waitForSelector(): ${
          hasWaitForSelector ? "YES" : "NO"
        }`
      );
      console.log(
        `❌ Uses deprecated clear(): ${hasClearMethod ? "YES" : "NO"}`
      );
      console.log(
        `✅ Uses fill('') for clearing: ${hasFillEmpty ? "YES" : "NO"}`
      );
      console.log(
        `✅ Uses toBeVisible() for errors: ${hasToBeVisible ? "YES" : "NO"}`
      );

      // Quality score
      const goodPractices = [
        hasLocator,
        !hasWaitForSelector,
        !hasClearMethod,
        hasFillEmpty,
        hasToBeVisible,
      ];
      const score = goodPractices.filter(Boolean).length;

      console.log(`\n🎯 Modern Playwright Score: ${score}/5`);

      if (score >= 4) {
        console.log("🎉 EXCELLENT! Generated code follows modern practices");
      } else if (score >= 3) {
        console.log("👍 GOOD! Most practices are modern");
      } else {
        console.log("⚠️ NEEDS IMPROVEMENT! Still using deprecated patterns");
      }
    } else {
      console.log("❌ No code generated to analyze");
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Export for use in other tests
module.exports = { testImprovedTestGenerator };

// Run if called directly
if (require.main === module) {
  testImprovedTestGenerator().catch(console.error);
}
