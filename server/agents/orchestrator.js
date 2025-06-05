const promptEngineer = require("./promptEngineer");
const criticAgent = require("./criticAgent");

async function orchestrateTestPlan({
  description,
  howToReproduce,
  acceptanceCriteria,
  extras = [],
  maxRetries = 3,
}) {
  let testPlan = "";
  let testPlanFeedback = "";
  let attempts = 0;
  let improvedPromptSuffix = "";

  while (attempts < maxRetries) {
    attempts++;

    console.log(`🧠 Attempt #${attempts}: Prompt Engineer`);
    testPlan = await promptEngineer(
      description + improvedPromptSuffix,
      extras,
      howToReproduce,
      acceptanceCriteria
    );

    console.log(`🔍 Attempt #${attempts}: Critic Agent`);
    testPlanFeedback = await criticAgent(testPlan);

    if (testPlanFeedback.includes("✅ PASS")) {
      console.log(`✅ Approved on attempt #${attempts}`);
      return {
        success: true,
        attempts,
        testPlan,
        testPlanFeedback,
        final: true,
      };
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
