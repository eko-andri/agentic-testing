/**
 * Agentic Testing - Main Package Entry Point
 * Live UI analysis and automated test generation for web applications
 */

const LiveUIAnalyzer = require("./server/liveUIAnalyzer");
const { Orchestrator } = require("./server/orchestrator");

/**
 * AgenticTesting - Main class for package integration
 */
class AgenticTesting {
  constructor(options = {}) {
    this.options = {
      baseUrl: options.baseUrl || "http://localhost:3000",
      timeout: options.timeout || 30000,
      headless: options.headless !== false,
      ...options,
    };
    this.analyzer = null;
  }

  /**
   * Initialize the testing suite
   */
  async initialize() {
    this.analyzer = new LiveUIAnalyzer({
      baseUrl: this.options.baseUrl,
      timeout: this.options.timeout,
      headless: this.options.headless,
    });

    await this.analyzer.initialize();
    return this;
  }

  /**
   * Analyze a specific page or route
   */
  async analyzePage(route = "/") {
    if (!this.analyzer) {
      throw new Error(
        "Testing suite not initialized. Call initialize() first."
      );
    }

    await this.analyzer.navigateToApp(route);
    return await this.analyzer.analyzePage();
  }

  /**
   * Generate test recommendations based on analysis
   */
  generateTestRecommendations(analysis) {
    const recommendations = {
      testCases: [],
      riskAreas: [],
      coverage: {
        forms: 0,
        interactions: 0,
        validations: 0,
      },
    };

    // Analyze forms
    if (analysis.forms && analysis.forms.length > 0) {
      recommendations.coverage.forms = analysis.forms.length;

      analysis.forms.forEach((form, index) => {
        recommendations.testCases.push({
          type: "form_validation",
          priority: "high",
          description: `Test form validation for ${form.id || `form-${index}`}`,
          selector: form.id ? `#${form.id}` : `form:nth-of-type(${index + 1})`,
          scenarios: [
            "Empty form submission",
            "Valid form submission",
            "Invalid data submission",
          ],
        });

        // Check for required fields
        form.fields.forEach((field) => {
          if (field.required) {
            recommendations.riskAreas.push({
              type: "required_field",
              field: field.name || field.id,
              message: `Required field ${
                field.name || field.id
              } needs validation testing`,
            });
          }

          if (field.type === "date") {
            recommendations.riskAreas.push({
              type: "date_validation",
              field: field.name || field.id,
              message: `Date field ${
                field.name || field.id
              } needs format and range validation`,
            });
          }
        });
      });
    }

    return recommendations;
  }

  /**
   * Run automated testing for a user journey
   */
  async runUserJourney(journeySteps) {
    const results = [];

    for (let i = 0; i < journeySteps.length; i++) {
      const step = journeySteps[i];

      try {
        const analysis = await this.analyzePage(step.route);
        const recommendations = this.generateTestRecommendations(analysis);

        results.push({
          step: i + 1,
          route: step.route,
          description: step.description,
          analysis,
          recommendations,
          status: "success",
        });
      } catch (error) {
        results.push({
          step: i + 1,
          route: step.route,
          description: step.description,
          error: error.message,
          status: "failed",
        });
      }
    }

    return results;
  }

  /**
   * Generate comprehensive test report
   */
  generateTestReport(journeyResults) {
    const report = {
      summary: {
        totalSteps: journeyResults.length,
        successfulSteps: journeyResults.filter((r) => r.status === "success")
          .length,
        failedSteps: journeyResults.filter((r) => r.status === "failed").length,
        coverage: {
          totalForms: 0,
          totalFields: 0,
          requiredFields: 0,
        },
      },
      recommendations: [],
      riskAreas: [],
    };

    journeyResults.forEach((result) => {
      if (result.analysis && result.analysis.forms) {
        report.summary.coverage.totalForms += result.analysis.forms.length;

        result.analysis.forms.forEach((form) => {
          report.summary.coverage.totalFields += form.fields.length;
          report.summary.coverage.requiredFields += form.fields.filter(
            (f) => f.required
          ).length;
        });
      }

      if (result.recommendations) {
        report.recommendations.push(...result.recommendations.testCases);
        report.riskAreas.push(...result.recommendations.riskAreas);
      }
    });

    return report;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.analyzer) {
      await this.analyzer.cleanup();
    }
  }
}

// Export main classes and utilities
module.exports = {
  AgenticTesting,
  LiveUIAnalyzer,
  Orchestrator,
};

// Export default
module.exports.default = AgenticTesting;
