/**
 * Agentic Testing Utility
 * Modular testing utility that reuses existing methods from classes
 * Usage: node testing-util.js --test-[component] [options]
 */

const { Orchestrator } = require("../orchestrator");
const LiveUIAnalyzer = require("../liveUIAnalyzer");
const { callLLM } = require("../utils");
const fs = require("fs");
const path = require("path");

class AgenticTestingUtil {
  constructor() {
    this.baseUrl = "http://127.0.0.1:5500";
    this.formPath = "/policy-form.html";
    this.testUrl = `${this.baseUrl}${this.formPath}`;
  }

  /**
   * Test AWS Bedrock integration
   */
  async testBedrock() {
    console.log("🔧 Testing AWS Bedrock Integration");
    console.log("==================================");

    try {
      // Use existing orchestrator method to check provider status
      const orchestrator = new Orchestrator();
      const status = await orchestrator.getProviderStatus();

      console.log("📊 Provider Status:");
      console.log(`   - Bedrock Available: ${status.bedrock ? "✅" : "❌"}`);
      console.log(`   - Ollama Available: ${status.ollama ? "✅" : "❌"}`);
      console.log(`   - Current Provider: ${status.currentProvider}`);

      if (status.bedrock) {
        console.log("🧪 Testing Bedrock LLM call...");
        const response = await callLLM(
          "Test message: Hello from Bedrock test",
          "bedrock"
        );
        console.log("✅ Bedrock test successful");
        console.log(`   Response length: ${response.length} characters`);
      } else {
        console.log("❌ Bedrock not available - check AWS credentials");
      }

      return status;
    } catch (error) {
      console.error("❌ Bedrock test failed:", error.message);
      throw error;
    }
  }

  /**
   * Test Puppeteer/Browser integration
   */
  async testPuppeteer() {
    console.log("🕷️  Testing Puppeteer Integration");
    console.log("=================================");

    try {
      // Use existing LiveUIAnalyzer methods
      const analyzer = new LiveUIAnalyzer();

      console.log("🚀 Initializing browser...");
      await analyzer.initialize();

      console.log("🌐 Testing navigation...");
      await analyzer.navigateToApp(this.formPath);

      console.log("📸 Testing screenshot...");
      await analyzer.captureScreenshot("puppeteer-test.png");

      console.log("🔍 Testing page analysis...");
      const analysis = await analyzer.analyzePage();

      console.log("✅ Puppeteer test successful");
      console.log(`   - Forms detected: ${analysis.forms?.length || 0}`);
      console.log(`   - Inputs detected: ${analysis.inputs?.length || 0}`);

      await analyzer.cleanup();
      return analysis;
    } catch (error) {
      console.error("❌ Puppeteer test failed:", error.message);
      throw error;
    }
  }

  /**
   * Test Ollama integration
   */
  async testOllama() {
    console.log("🦙 Testing Ollama Integration");
    console.log("=============================");

    try {
      console.log("🔌 Testing Ollama connection...");
      const response = await callLLM(
        "Test message: Hello from Ollama test",
        "ollama"
      );

      console.log("✅ Ollama test successful");
      console.log(`   Response length: ${response.length} characters`);
      console.log(`   First 100 chars: ${response.substring(0, 100)}...`);

      return response;
    } catch (error) {
      console.error("❌ Ollama test failed:", error.message);
      console.error("   Make sure Ollama is running: ollama serve");
      throw error;
    }
  }

  /**
   * Test form validation pipeline
   */
  async testValidation() {
    console.log("🎯 Testing Form Validation Pipeline");
    console.log("===================================");

    try {
      // Use existing orchestrator run method
      const orchestrator = new Orchestrator({
        description: "Test form validation fields",
        acceptanceCriteria: "All fields should have proper validation",
        testUrl: this.testUrl,
        analysisMethod: "live-ui",
      });

      console.log("📋 Running validation pipeline...");
      const result = await orchestrator.run();

      console.log("✅ Validation pipeline successful");
      if (result && result.testFile) {
        console.log(`   - Generated test: ${result.testFile}`);
      }

      return result;
    } catch (error) {
      console.error("❌ Validation test failed:", error.message);
      throw error;
    }
  }

  /**
   * Test live UI analysis specifically
   */
  async testLiveUI() {
    console.log("🖥️  Testing Live UI Analysis");
    console.log("============================");

    try {
      const analyzer = new LiveUIAnalyzer();
      await analyzer.initialize();
      await analyzer.navigateToApp(this.formPath);

      console.log("🔍 Analyzing form structure...");
      const analysis = await analyzer.analyzePage();

      console.log("📊 Analysis Results:");
      console.log(`   - Forms: ${analysis.forms?.length || 0}`);
      console.log(`   - Inputs: ${analysis.inputs?.length || 0}`);

      if (analysis.inputs) {
        analysis.inputs.forEach((input, i) => {
          console.log(`   ${i + 1}. ${input.name || input.id} (${input.type})`);
        });
      }

      await analyzer.cleanup();
      return analysis;
    } catch (error) {
      console.error("❌ Live UI test failed:", error.message);
      throw error;
    }
  }

  /**
   * Test test generation consistency
   */
  async testConsistency() {
    console.log("🔄 Testing Generation Consistency");
    console.log("=================================");

    const results = [];
    const iterations = 3;

    for (let i = 1; i <= iterations; i++) {
      console.log(`\n🔄 Iteration ${i}/${iterations}`);
      try {
        const orchestrator = new Orchestrator({
          description: `Consistency test iteration ${i}`,
          acceptanceCriteria: "Form validation test",
          testUrl: this.testUrl,
          analysisMethod: "live-ui",
        });

        const result = await orchestrator.run();
        results.push({ iteration: i, success: true, result });
        console.log(`✅ Iteration ${i} completed`);
      } catch (error) {
        results.push({ iteration: i, success: false, error: error.message });
        console.log(`❌ Iteration ${i} failed: ${error.message}`);
      }
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(
      `\n📊 Consistency Results: ${successCount}/${iterations} successful`
    );

    return results;
  }

  /**
   * Test all components (comprehensive test)
   */
  async testAll() {
    console.log("🚀 Running All Component Tests");
    console.log("==============================");

    const tests = [
      { name: "Puppeteer", method: "testPuppeteer" },
      { name: "Ollama", method: "testOllama" },
      { name: "Bedrock", method: "testBedrock" },
      { name: "Context Filter", method: "testContextFilter" },
      { name: "Live UI", method: "testLiveUI" },
      { name: "Validation", method: "testValidation" },
    ];

    const results = {};

    for (const test of tests) {
      console.log(`\n🔧 Testing ${test.name}...`);
      try {
        const result = await this[test.method]();
        results[test.name] = { success: true, result };
        console.log(`✅ ${test.name} passed`);
      } catch (error) {
        results[test.name] = { success: false, error: error.message };
        console.log(`❌ ${test.name} failed`);
      }
    }

    console.log("\n📈 Final Results Summary:");
    console.log("=========================");
    Object.entries(results).forEach(([name, result]) => {
      const status = result.success ? "✅" : "❌";
      console.log(`${status} ${name}`);
    });

    return results;
  }

  /**
   * Quick health check
   */
  async healthCheck() {
    console.log("🏥 Health Check");
    console.log("===============");

    try {
      // Check if server is running
      const response = await fetch(this.testUrl).catch(() => null);
      const serverStatus = response ? "✅" : "❌";
      console.log(`Server (${this.testUrl}): ${serverStatus}`);

      // Check Ollama
      const ollama = await callLLM("test", "ollama")
        .then(() => true)
        .catch(() => false);
      console.log(`Ollama: ${ollama ? "✅" : "❌"}`);

      // Check Bedrock
      const orchestrator = new Orchestrator();
      const providerStatus = await orchestrator.getProviderStatus();
      console.log(`Bedrock: ${providerStatus.bedrock ? "✅" : "❌"}`);

      return {
        server: !!response,
        ollama,
        bedrock: providerStatus.bedrock,
      };
    } catch (error) {
      console.error("❌ Health check failed:", error.message);
      throw error;
    }
  }

  /**
   * Test Context Filter Agent specifically
   */
  async testContextFilter() {
    console.log("🧠 Testing Context Filter Agent");
    console.log("===============================");

    try {
      const { ContextFilterAgent } = require("../contextFilterAgent");
      const filterAgent = new ContextFilterAgent();

      // Mock form fields (like our policy form)
      const mockFields = [
        { name: "dob", type: "date", id: "dob", required: true },
        { name: "email", type: "email", id: "email", required: true },
        { name: "mobile", type: "tel", id: "mobile", required: true },
      ];

      console.log("📋 Testing different scenarios...");

      // Test 1: DOB-specific context
      console.log("\n🧪 Test 1: DOB-specific context");
      const dobResult = await filterAgent.filterRelevantFields(
        mockFields,
        "Customer wants a policy holder date of birth is start from 16 years",
        "DOB minimum is 16 instead of 18"
      );
      console.log(
        `   - Fields selected: ${dobResult.map((f) => f.name).join(", ")}`
      );

      // Test 2: Email-specific context
      console.log("\n🧪 Test 2: Email-specific context");
      const emailResult = await filterAgent.filterRelevantFields(
        mockFields,
        "Validate email format for newsletter subscription",
        "Email must be valid format and required"
      );
      console.log(
        `   - Fields selected: ${emailResult.map((f) => f.name).join(", ")}`
      );

      // Test 3: All fields context
      console.log("\n🧪 Test 3: All fields context");
      const allResult = await filterAgent.filterRelevantFields(
        mockFields,
        "Test form validation fields",
        "All fields should have proper validation"
      );
      console.log(
        `   - Fields selected: ${allResult.map((f) => f.name).join(", ")}`
      );

      console.log("\n✅ Context Filter Agent test successful");
      return { dobResult, emailResult, allResult };
    } catch (error) {
      console.error("❌ Context Filter Agent test failed:", error.message);
      throw error;
    }
  }
}

// Export the class
module.exports = { AgenticTestingUtil };

// CLI Interface
if (require.main === module) {
  const util = new AgenticTestingUtil();

  // Parse command line arguments
  const args = process.argv.slice(2);
  const command = args[0];

  // Command mapping
  const commands = {
    "--test-bedrock": () => util.testBedrock(),
    "--test-puppeteer": () => util.testPuppeteer(),
    "--test-ollama": () => util.testOllama(),
    "--test-context-filter": () => util.testContextFilter(),
    "--test-validation": () => util.testValidation(),
    "--test-liveui": () => util.testLiveUI(),
    "--test-consistency": () => util.testConsistency(),
    "--test-all": () => util.testAll(),
    "--health-check": () => util.healthCheck(),
    "--help": () => {
      console.log(`
🛠️  Agentic Testing Utility
===========================

Usage: node testing-util.js [command]

Commands:
  --test-bedrock         Test AWS Bedrock integration
  --test-puppeteer       Test Puppeteer/browser functionality  
  --test-ollama          Test Ollama LLM integration
  --test-context-filter  Test Context Filter Agent
  --test-validation      Test form validation pipeline
  --test-liveui          Test live UI analysis
  --test-consistency     Test generation consistency
  --test-all             Run all tests
  --health-check         Quick health check of all components
  --help                 Show this help message

Examples:
  node testing-util.js --test-puppeteer
  node testing-util.js --test-all
  node testing-util.js --health-check
            `);
    },
  };

  if (command && commands[command]) {
    commands[command]().catch((error) => {
      console.error("❌ Command failed:", error.message);
      process.exit(1);
    });
  } else {
    console.log("❌ Unknown command. Use --help for available commands.");
    commands["--help"]();
    process.exit(1);
  }
}
