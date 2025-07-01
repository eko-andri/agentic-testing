/**
 * Test Generator Consistency Check
 * Runs multiple generations to verify consistency
 */

const { Orchestrator } = require("../orchestrator");

async function testGeneratorConsistency() {
  console.log("🧪 Testing Generator Consistency");
  console.log("===============================");

  const testConfig = {
    description:
      "Customer wants a policy holder date of birth is start from 16 years",
    acceptanceCriteria:
      "1. DOB minimum is 16 instead of 18\n2. previous validation should still work",
    testUrl: "http://127.0.0.1:5500/policy-form.html",
    analysisMethod: "live-ui",
  };

  const results = [];
  const iterations = 3;

  for (let i = 1; i <= iterations; i++) {
    console.log(`\n🔄 Generation ${i}/${iterations}`);

    try {
      const orchestrator = new Orchestrator(testConfig);
      const result = await orchestrator.run();

      if (result && result.code) {
        // Analyze consistency metrics
        const analysis = {
          iteration: i,
          codeLength: result.code.length,
          hasLocator: result.code.includes("page.locator("),
          hasWaitForSelector: result.code.includes("waitForSelector"),
          hasClearMethod: result.code.includes(".clear()"),
          hasFillEmpty: result.code.includes("fill('')"),
          hasToBeVisible: result.code.includes("toBeVisible()"),
          testCount: (result.code.match(/test\(/g) || []).length,
          dateCalculation: result.code.includes("setFullYear"),
        };

        results.push(analysis);

        console.log(`   ✅ Generated ${analysis.testCount} tests`);
        console.log(
          `   ✅ Modern patterns: ${analysis.hasLocator ? "YES" : "NO"}`
        );
        console.log(
          `   ✅ Date logic: ${analysis.dateCalculation ? "YES" : "NO"}`
        );
      } else {
        console.log(`   ❌ Generation ${i} failed`);
      }

      // Add delay between generations
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`   ❌ Generation ${i} error:`, error.message);
    }
  }

  // Analyze consistency
  console.log("\n📊 Consistency Analysis:");
  console.log("========================");

  if (results.length === 0) {
    console.log("❌ No successful generations to analyze");
    return;
  }

  const metrics = {
    avgCodeLength:
      results.reduce((sum, r) => sum + r.codeLength, 0) / results.length,
    avgTestCount:
      results.reduce((sum, r) => sum + r.testCount, 0) / results.length,
    modernPatternConsistency:
      (results.filter((r) => r.hasLocator).length / results.length) * 100,
    deprecatedPatternAvoidance:
      (results.filter((r) => !r.hasWaitForSelector).length / results.length) *
      100,
    dateLogicConsistency:
      (results.filter((r) => r.dateCalculation).length / results.length) * 100,
  };

  console.log(
    `Average Code Length: ${metrics.avgCodeLength.toFixed(0)} characters`
  );
  console.log(`Average Test Count: ${metrics.avgTestCount.toFixed(1)} tests`);
  console.log(
    `Modern Pattern Usage: ${metrics.modernPatternConsistency.toFixed(1)}%`
  );
  console.log(
    `Deprecated Pattern Avoidance: ${metrics.deprecatedPatternAvoidance.toFixed(
      1
    )}%`
  );
  console.log(
    `Date Logic Consistency: ${metrics.dateLogicConsistency.toFixed(1)}%`
  );

  // Consistency score
  const overallScore =
    (metrics.modernPatternConsistency +
      metrics.deprecatedPatternAvoidance +
      metrics.dateLogicConsistency) /
    3;

  console.log(`\n🎯 Overall Consistency Score: ${overallScore.toFixed(1)}%`);

  if (overallScore >= 90) {
    console.log("🎉 EXCELLENT! Generator is highly consistent");
  } else if (overallScore >= 75) {
    console.log("👍 GOOD! Generator is mostly consistent");
  } else {
    console.log("⚠️ NEEDS IMPROVEMENT! Generator consistency issues");
  }
}

// Export for use in other tests
module.exports = { testGeneratorConsistency };

// Run if called directly
if (require.main === module) {
  testGeneratorConsistency().catch(console.error);
}
