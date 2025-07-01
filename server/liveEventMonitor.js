/**
 * Live Event Monitor - Monitors form submissions and triggers agent actions
 * This is the missing piece for real-time agent integration
 */

const { EventEmitter } = require("events");
const LiveUIAnalyzer = require("./liveUIAnalyzer");
const { Orchestrator } = require("./orchestrator");

class LiveEventMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.analyzer = new LiveUIAnalyzer(options);
    this.isMonitoring = false;
    this.formSubmissionHandlers = new Map();
  }

  /**
   * Start monitoring form submissions on the live application
   */
  async startMonitoring(targetUrl = "/policy-form.html") {
    console.log("🎯 Starting Live Event Monitoring...");

    await this.analyzer.initialize();
    await this.analyzer.navigateToApp(targetUrl);

    // Inject event monitoring script into the page
    await this.analyzer.page.evaluateOnNewDocument(() => {
      // This runs in the browser context
      document.addEventListener("DOMContentLoaded", () => {
        // Monitor all form submissions
        document.addEventListener("submit", (event) => {
          const formData = new FormData(event.target);
          const formInfo = {
            formId: event.target.id,
            action: event.target.action,
            method: event.target.method,
            data: Object.fromEntries(formData.entries()),
            timestamp: new Date().toISOString(),
            url: window.location.href,
          };

          // Send event to Node.js context
          window.formSubmissionEvent = formInfo;
        });
      });
    });

    // Start polling for form submission events
    this.isMonitoring = true;
    this.pollForEvents();

    console.log("✅ Live Event Monitoring started");
  }

  /**
   * Poll for form submission events from the browser
   */
  async pollForEvents() {
    if (!this.isMonitoring) return;

    try {
      // Check for form submission events
      const formEvent = await this.analyzer.page.evaluate(() => {
        const event = window.formSubmissionEvent;
        if (event) {
          window.formSubmissionEvent = null; // Clear the event
          return event;
        }
        return null;
      });

      if (formEvent) {
        console.log("📝 Form submission detected:", formEvent);

        // Emit event to trigger agent actions
        this.emit("formSubmitted", formEvent);

        // Trigger agent processing
        await this.processFormSubmission(formEvent);
      }
    } catch (error) {
      console.error("Error polling for events:", error);
    }

    // Continue polling
    setTimeout(() => this.pollForEvents(), 1000);
  }

  /**
   * Process form submission with agent actions
   */
  async processFormSubmission(formEvent) {
    console.log("🤖 Triggering Agent Actions for form submission...");

    try {
      // Agent 1: Form Validation Analysis
      const validationAgent = await this.analyzeFormValidation(formEvent);

      // Agent 2: Test Generation
      const testGenerationAgent = await this.generateTestsFromSubmission(
        formEvent
      );

      // Agent 3: Risk Assessment
      const riskAgent = await this.assessSubmissionRisks(formEvent);

      // Agent 4: Recommendation Engine
      const recommendationAgent = await this.generateRecommendations({
        validation: validationAgent,
        tests: testGenerationAgent,
        risks: riskAgent,
      });

      console.log("✅ All agents completed processing");

      // Emit comprehensive results
      this.emit("agentProcessingComplete", {
        formEvent,
        agentResults: {
          validation: validationAgent,
          testGeneration: testGenerationAgent,
          riskAssessment: riskAgent,
          recommendations: recommendationAgent,
        },
      });
    } catch (error) {
      console.error("❌ Agent processing failed:", error);
      this.emit("agentProcessingError", { formEvent, error });
    }
  }

  /**
   * Agent 1: Analyze form validation behavior
   */
  async analyzeFormValidation(formEvent) {
    console.log("🔍 Agent 1: Analyzing form validation...");

    // Re-analyze the current form state
    const currentAnalysis = await this.analyzer.analyzePage();

    // Check for validation errors
    const validationErrors = await this.analyzer.page.evaluate(() => {
      const errorElements = document.querySelectorAll(
        '.error-message, [class*="error"]'
      );
      return Array.from(errorElements)
        .map((el) => ({
          text: el.textContent.trim(),
          visible: el.offsetParent !== null,
          fieldId: el.id || el.getAttribute("for") || "unknown",
        }))
        .filter((err) => err.text && err.visible);
    });

    return {
      agent: "FormValidationAnalyzer",
      formData: formEvent.data,
      validationErrors,
      formStructure: currentAnalysis.forms[0] || null,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Agent 2: Generate tests based on submission
   */
  async generateTestsFromSubmission(formEvent) {
    console.log("🧪 Agent 2: Generating tests from submission...");

    // Generate test scenarios based on actual submission
    const testScenarios = [];

    // Test the exact submission data
    testScenarios.push({
      type: "positive",
      description: "Test successful form submission with valid data",
      testData: formEvent.data,
      expectedResult: "success",
    });

    // Generate negative test cases
    for (const [field, value] of Object.entries(formEvent.data)) {
      testScenarios.push({
        type: "negative",
        description: `Test form submission with empty ${field}`,
        testData: { ...formEvent.data, [field]: "" },
        expectedResult: "validation_error",
      });
    }

    return {
      agent: "TestGenerator",
      scenarios: testScenarios,
      formEvent,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Agent 3: Assess submission risks
   */
  async assessSubmissionRisks(formEvent) {
    console.log("⚠️ Agent 3: Assessing submission risks...");

    const risks = [];

    // Check for missing required fields
    for (const [field, value] of Object.entries(formEvent.data)) {
      if (!value || value.trim() === "") {
        risks.push({
          type: "validation_risk",
          field,
          severity: "high",
          message: `Required field ${field} is empty`,
        });
      }
    }

    // Check for date format issues
    if (formEvent.data.dob) {
      const dobDate = new Date(formEvent.data.dob);
      if (isNaN(dobDate.getTime())) {
        risks.push({
          type: "data_format_risk",
          field: "dob",
          severity: "medium",
          message: "Invalid date format detected",
        });
      }
    }

    return {
      agent: "RiskAssessment",
      risks,
      riskLevel: risks.length > 0 ? "high" : "low",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Agent 4: Generate recommendations
   */
  async generateRecommendations(agentResults) {
    console.log("💡 Agent 4: Generating recommendations...");

    const recommendations = [];

    // Based on validation results
    if (agentResults.validation.validationErrors.length > 0) {
      recommendations.push({
        type: "fix_validation",
        priority: "high",
        message: "Fix form validation errors before proceeding",
        details: agentResults.validation.validationErrors,
      });
    }

    // Based on risk assessment
    if (agentResults.risks.riskLevel === "high") {
      recommendations.push({
        type: "address_risks",
        priority: "high",
        message: "Address identified risks in form submission",
        details: agentResults.risks.risks,
      });
    }

    // Based on test generation
    recommendations.push({
      type: "run_tests",
      priority: "medium",
      message: `Run ${agentResults.testGeneration.scenarios.length} generated test scenarios`,
      details: agentResults.testGeneration.scenarios,
    });

    return {
      agent: "RecommendationEngine",
      recommendations,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Stop monitoring
   */
  async stopMonitoring() {
    console.log("🛑 Stopping Live Event Monitoring...");
    this.isMonitoring = false;
    if (this.analyzer) {
      await this.analyzer.cleanup();
    }
    console.log("✅ Monitoring stopped");
  }
}

module.exports = LiveEventMonitor;
