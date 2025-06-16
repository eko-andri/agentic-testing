const promptEngineer = require("../agents/promptEngineer");
const criticAgent = require("../agents/criticAgent");
const analyzeFormContext = require("./formContextAnalyzer");
const testGenerator = require("../agents/testGenerator");
const TestReviewAgent = require("../agents/testReviewAgent");
const { updateProgress, resetProgress } = require("./progressStatus");

class Orchestrator {
  constructor({
    description,
    acceptanceCriteria,
    htmlPath,
    extras = [],
    maxRetries = 3,
    enabledAgents = {
      formAnalyzer: true,
      promptEngineer: true,
      criticAgent: true,
      testGenerator: true,
      reviewAgent: true,
    },
  }) {
    this.description = description;
    this.acceptanceCriteria = acceptanceCriteria;
    this.htmlPath = htmlPath;
    this.extras = extras;
    this.maxRetries = maxRetries;
    this.enabledAgents = enabledAgents;

    this.testPlan = "";
    this.testPlanFeedback = "";
    this.formContext = null;
    this.attempts = 0;
    this.improvedPromptSuffix = "";
  }

  async run() {
    resetProgress();

    // Skip agent if disabled; useful for testing specific agent in isolation
    if (this.skipIfDisabled("formAnalyzer")) return;
    await this.runAgentStep("Form Analyzer", async () => {
      this.formContext = await analyzeFormContext(
        this.htmlPath,
        this.description || "",
        this.acceptanceCriteria || ""
      );
      return JSON.stringify(this.formContext, null, 2);
    });

    if (this.skipIfDisabled("promptEngineer")) return;

    while (this.attempts < this.maxRetries) {
      this.attempts++;
      const fullDescription = this.description + this.improvedPromptSuffix;

      const testPlan = await this.runAgentStep(
        `Prompt Engineer (attempt ${this.attempts})`,
        () =>
          promptEngineer(
            fullDescription,
            this.extras,
            "",
            this.acceptanceCriteria,
            this.formContext
          )
      );

      if (!testPlan)
        return { success: false, message: "Prompt Engineer failed" };
      this.testPlan = testPlan;

      if (this.skipIfDisabled("criticAgent")) return;

      const feedback = await this.runAgentStep("Critic Agent", () =>
        criticAgent(this.testPlan)
      );
      if (!feedback) return { success: false, message: "Critic Agent failed" };
      this.testPlanFeedback = feedback;

      if (this.testPlanFeedback.includes("✅ PASS")) {
        if (this.skipIfDisabled("testGenerator")) return;

        const playwrightCode = await this.runAgentStep("Test Generator", () =>
          testGenerator(this.testPlan, this.htmlPath, this.formContext)
        );
        if (!playwrightCode)
          return { success: false, message: "Test Generator failed" };

        if (this.skipIfDisabled("reviewAgent")) return;

        const reviewResult = await this.runAgentStep(
          "Review Agent",
          async () => {
            const agent = new TestReviewAgent();
            const result = await agent.evaluate(playwrightCode);
            if (!result.approved)
              throw new Error("Script failed review.\n" + result.feedback);
            return "✅ Approved";
          }
        );

        if (!reviewResult)
          return { success: false, message: "Review Agent failed" };

        return {
          success: true,
          testPlan: this.testPlan,
          playwrightCode,
          message: "Test generated successfully.",
        };
      }

      this.improvedPromptSuffix = this.extractPromptFixes(
        this.testPlanFeedback
      );
    }

    return {
      success: false,
      message: "Max retries reached. Test generation failed.",
      testPlan: this.testPlan,
      testPlanFeedback: this.testPlanFeedback,
    };
  }

  shouldSkip(agentKey) {
    return !this.enabledAgents[agentKey];
  }

  skipResult(agentLabel, extra = {}) {
    updateProgress({ status: `⏭️ Skipping ${agentLabel}` });
    return {
      success: true,
      message: `Stopped after ${agentLabel}`,
      ...extra,
    };
  }

  skipIfDisabled(agentKey) {
    if (this.shouldSkip(agentKey)) {
      const label = agentKey
        .replace(/([A-Z])/g, " $1")
        .replace(/^\w/, (c) => c.toUpperCase());
      const result = this.skipResult(label);
      if (result) {
        // Ensure early return if this method is called inside `run()`
        return result;
      }
    }
    return false;
  }

  async runAgentStep(name, agentFn) {
    try {
      updateProgress({ status: `🔍 Agent: ${name}...` });
      const result = await agentFn();
      updateProgress({ status: `✅ Agent: ${name}`, prompt: String(result) });
      return result;
    } catch (err) {
      updateProgress({
        status: `❌ Agent: ${name} (Failed)`,
        prompt: err.message,
      });
      return null;
    }
  }

  extractPromptFixes(feedback) {
    const lines = feedback.split("\n");
    const fixes = lines.filter(
      (line) => line.startsWith("-") || line.startsWith("•")
    );
    return fixes.length
      ? `\n\nAlso consider edge cases such as: ${fixes.join("; ")}`
      : "";
  }
}

module.exports = Orchestrator;
