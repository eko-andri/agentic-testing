#!/usr/bin/env node

/**
 * Unified Test Runner - All-in-One Testing Tool for Agentic Testing System
 * Menggabungkan semua testing functionality dalam satu file yang modular
 *
 * Usage:
 * node unified-test-runner.js --help
 * node unified-test-runner.js --database
 * node unified-test-runner.js --analysis
 * node unified-test-runner.js --e2e
 * node unified-test-runner.js --all
 */

const DatabaseAgent = require("../database/databaseAgent");
const TestAnalysisAgent = require("../testAnalysisAgent");
const SyncManager = require("./sync-manager");
const BATestingManager = require("./ba-testing-manager");
const TestValidationManager = require("./test-validation-manager");
const { Orchestrator } = require("../orchestrator");
const fs = require("fs");
const path = require("path");

class UnifiedTestRunner {
  constructor() {
    this.results = {
      database: null,
      analysis: null,
      e2e: null,
      summary: {
        passed: 0,
        failed: 0,
        total: 0,
      },
    };
  }

  /**
   * Test Database Agent functionality
   */
  async testDatabaseAgent() {
    console.log("\n🗄️  Testing Database Agent...");
    console.log("=".repeat(50));

    try {
      const db = new DatabaseAgent();
      await db.initialize();

      let passed = 0;
      let failed = 0;
      const tests = [];

      // Test 1: Basic CRUD Operations
      console.log("\n📝 Test 1: Basic CRUD Operations");
      try {
        // Test Context Creation
        const contextData = {
          description: "Test context for unified testing",
          acceptanceCriteria: "System should handle context operations",
          testType: "unit",
          priority: "high",
        };

        const contextId = await db.upsertTestContext(contextData);
        console.log("✅ Context created with ID:", contextId);

        // Test Context Retrieval
        const contexts = await db.getTestContexts({ id: contextId });
        if (
          contexts.length === 1 &&
          contexts[0].description === contextData.description
        ) {
          console.log("✅ Context retrieval successful");
          passed++;
        } else {
          throw new Error("Context retrieval failed");
        }

        tests.push({ name: "Basic CRUD Operations", status: "PASS" });
      } catch (error) {
        console.log("❌ Test 1 failed:", error.message);
        failed++;
        tests.push({
          name: "Basic CRUD Operations",
          status: "FAIL",
          error: error.message,
        });
      }

      // Test 2: Statistics and Analytics
      console.log("\n📊 Test 2: Statistics and Analytics");
      try {
        const stats = await db.getStats();
        if (stats && typeof stats.total_contexts === "number") {
          console.log("✅ Statistics retrieved:", {
            contexts: stats.total_contexts,
            tests: stats.active_tests,
            executions: stats.total_executions,
          });
          passed++;
          tests.push({ name: "Statistics and Analytics", status: "PASS" });
        } else {
          throw new Error("Invalid statistics format");
        }
      } catch (error) {
        console.log("❌ Test 2 failed:", error.message);
        failed++;
        tests.push({
          name: "Statistics and Analytics",
          status: "FAIL",
          error: error.message,
        });
      }

      // Test 3: Similar Context Analysis
      console.log("\n🔍 Test 3: Similar Context Analysis");
      try {
        const similar = await db.getSimilarContexts("validation testing", 3);
        console.log("✅ Similar contexts found:", similar.length);
        passed++;
        tests.push({ name: "Similar Context Analysis", status: "PASS" });
      } catch (error) {
        console.log("❌ Test 3 failed:", error.message);
        failed++;
        tests.push({
          name: "Similar Context Analysis",
          status: "FAIL",
          error: error.message,
        });
      }

      await db.close();

      const result = {
        passed,
        failed,
        total: passed + failed,
        successRate: ((passed / (passed + failed)) * 100).toFixed(1),
        tests,
      };

      console.log(`\n📊 Database Agent Test Summary:`);
      console.log(`   Passed: ${passed} ✅`);
      console.log(`   Failed: ${failed} ❌`);
      console.log(`   Success Rate: ${result.successRate}%`);

      return result;
    } catch (error) {
      console.error("❌ Database Agent test setup failed:", error.message);
      return {
        passed: 0,
        failed: 1,
        total: 1,
        successRate: "0.0",
        tests: [
          { name: "Database Setup", status: "FAIL", error: error.message },
        ],
      };
    }
  }

  /**
   * Test TestAnalysis Agent functionality
   */
  async testAnalysisAgent() {
    console.log("\n🧠 Testing Test Analysis Agent...");
    console.log("=".repeat(50));

    try {
      const agent = new TestAnalysisAgent();

      let passed = 0;
      let failed = 0;
      const tests = [];

      // Test 1: Context Analysis
      console.log("\n🔍 Test 1: Context Analysis");
      try {
        const formFields = [
          { name: "email", type: "email", id: "email", required: true },
          {
            name: "password",
            type: "password",
            id: "password",
            required: true,
          },
        ];

        const context = {
          description: "Login form validation testing",
          acceptanceCriteria:
            "User should be able to login with valid credentials",
          relevantFields: ["email", "password"],
        };

        const plan = await agent.analyzeContext(formFields, context);

        if (plan && plan.relevantFields && plan.testStrategy) {
          console.log("✅ Context analysis successful");
          console.log("   Relevant fields:", plan.relevantFields.length);
          console.log("   Test strategy:", plan.testStrategy);
          passed++;
          tests.push({ name: "Context Analysis", status: "PASS" });
        } else {
          throw new Error("Invalid context analysis result");
        }
      } catch (error) {
        console.log("❌ Test 1 failed:", error.message);
        failed++;
        tests.push({
          name: "Context Analysis",
          status: "FAIL",
          error: error.message,
        });
      }

      // Test 2: Test Plan Generation
      console.log("\n📋 Test 2: Test Plan Generation");
      try {
        const testPlan = agent._generateTestPlan(["email"], "LOGIN", ["email"]);

        if (testPlan && testPlan.coreTests && testPlan.businessTests) {
          console.log("✅ Test plan generation successful");
          console.log("   Core tests:", testPlan.coreTests.length);
          console.log("   Business tests:", testPlan.businessTests.length);
          passed++;
          tests.push({ name: "Test Plan Generation", status: "PASS" });
        } else {
          throw new Error("Invalid test plan format");
        }
      } catch (error) {
        console.log("❌ Test 2 failed:", error.message);
        failed++;
        tests.push({
          name: "Test Plan Generation",
          status: "FAIL",
          error: error.message,
        });
      }

      await agent.close();

      const result = {
        passed,
        failed,
        total: passed + failed,
        successRate: ((passed / (passed + failed)) * 100).toFixed(1),
        tests,
      };

      console.log(`\n📊 Analysis Agent Test Summary:`);
      console.log(`   Passed: ${passed} ✅`);
      console.log(`   Failed: ${failed} ❌`);
      console.log(`   Success Rate: ${result.successRate}%`);

      return result;
    } catch (error) {
      console.error("❌ Analysis Agent test setup failed:", error.message);
      return {
        passed: 0,
        failed: 1,
        total: 1,
        successRate: "0.0",
        tests: [
          { name: "Analysis Setup", status: "FAIL", error: error.message },
        ],
      };
    }
  }

  /**
   * Test End-to-End Pipeline
   */
  async testE2EPipeline() {
    console.log("\n🚀 Testing End-to-End Pipeline...");
    console.log("=".repeat(50));

    const testScenarios = [
      {
        name: "Email Validation",
        analyzing: "http://localhost:5500/policy-form.html",
        description:
          "Validasi format email yang benar dan penolakan format email yang salah",
        criteria:
          "Email harus mengikuti format standard (user@domain.com) dan menolak format yang tidak valid",
      },
      {
        name: "Date Validation",
        analyzing: "http://localhost:5500/policy-form.html",
        description:
          "Validasi tanggal lahir harus dalam format yang benar dan tidak boleh di masa depan",
        criteria:
          "User dapat memasukkan tanggal lahir yang valid dan sistem menolak tanggal masa depan",
      },
    ];

    let passed = 0;
    let failed = 0;
    const tests = [];

    for (let i = 0; i < testScenarios.length; i++) {
      const scenario = testScenarios[i];
      console.log(`\n📋 Test ${i + 1}: ${scenario.name}`);

      try {
        const orchestrator = new Orchestrator({
          testUrl: scenario.analyzing,
          description: scenario.description,
          acceptanceCriteria: scenario.criteria,
          analysisMethod: "live-ui",
        });

        // Run full pipeline execution
        const result = await orchestrator.run();

        // Check if tests were actually generated by counting files
        const coreTestsAfter = require("fs").readdirSync(
          path.join(__dirname, "..", "tests", "core")
        ).length;
        const businessTestsAfter = require("fs").readdirSync(
          path.join(__dirname, "..", "tests", "business")
        ).length;
        const totalTestsGenerated = coreTestsAfter + businessTestsAfter;

        if (result && totalTestsGenerated > 0) {
          console.log(`✅ ${scenario.name} pipeline successful`);
          console.log(`   Generated: ${totalTestsGenerated} tests`);
          console.log(
            `   Core tests: ${coreTestsAfter}, Business tests: ${businessTestsAfter}`
          );
          passed++;
          tests.push({
            name: scenario.name,
            status: "PASS",
            generated: totalTestsGenerated,
            modified: 0,
          });
        } else {
          throw new Error("No tests generated or pipeline failed");
        }
      } catch (error) {
        console.log(`❌ Test ${i + 1} failed:`, error.message);
        failed++;
        tests.push({
          name: scenario.name,
          status: "FAIL",
          error: error.message,
        });
      }
    }

    const result = {
      passed,
      failed,
      total: passed + failed,
      successRate: ((passed / (passed + failed)) * 100).toFixed(1),
      tests,
    };

    console.log(`\n📊 E2E Pipeline Test Summary:`);
    console.log(`   Passed: ${passed} ✅`);
    console.log(`   Failed: ${failed} ❌`);
    console.log(`   Success Rate: ${result.successRate}%`);

    return result;
  }

  /**
   * Debug core test generation issues
   */
  async debugCoreTests() {
    console.log("\n🔧 Debugging Core Test Generation...");
    console.log("=".repeat(50));

    try {
      const DatabaseAgent = require("../database/databaseAgent");
      const TestAnalysisAgent = require("../testAnalysisAgent");
      const fs = require("fs");
      const path = require("path");

      let passed = 0;
      let failed = 0;
      const tests = [];

      // Test 1: Database vs Filesystem Consistency
      console.log("\n🔍 Test 1: Database vs Filesystem Consistency");
      try {
        const db = new DatabaseAgent();
        await db.initialize();

        const coreTests = await db.getTestFiles({ test_type: "core" });
        console.log(`📊 Core tests in database: ${coreTests.length}`);

        let inconsistencies = 0;
        coreTests.forEach((test) => {
          const exists = fs.existsSync(test.filepath);
          console.log(
            `   📄 ${test.filename}: ${exists ? "✅ EXISTS" : "❌ MISSING"}`
          );
          if (!exists) inconsistencies++;
        });

        if (inconsistencies === 0) {
          console.log("✅ Database and filesystem are consistent");
          passed++;
          tests.push({ name: "DB vs Filesystem Consistency", status: "PASS" });
        } else {
          console.log(`❌ Found ${inconsistencies} inconsistencies`);
          failed++;
          tests.push({
            name: "DB vs Filesystem Consistency",
            status: "FAIL",
            error: `${inconsistencies} missing files`,
          });
        }

        await db.close();
      } catch (error) {
        console.log("❌ Test 1 failed:", error.message);
        failed++;
        tests.push({
          name: "DB vs Filesystem Consistency",
          status: "FAIL",
          error: error.message,
        });
      }

      // Test 2: Core Test Generation Logic
      console.log("\n🧪 Test 2: Core Test Generation Logic");
      try {
        const agent = new TestAnalysisAgent();
        await agent.initialize();

        const phoneFields = [
          { name: "mobile", type: "tel", id: "mobile", required: true },
        ];

        // Test field grouping
        const grouped = agent.groupFieldsByType(phoneFields);
        const expectedType = "phone";
        const actualType = Object.keys(grouped)[0];

        console.log(`   📱 Field grouping: mobile(tel) → ${actualType}`);

        if (actualType === expectedType) {
          console.log("✅ Field grouping works correctly");

          // Test core test planning
          const analysis = await agent.analyzeContext(
            "Debug core phone validation",
            "Phone field validation test",
            phoneFields
          );

          console.log(
            `   📋 Core tests planned: ${analysis.testPlan.coreTests.length}`
          );
          console.log(
            `   📋 Business tests planned: ${analysis.testPlan.businessTests.length}`
          );

          if (analysis.testPlan.coreTests.length > 0) {
            console.log("✅ Core test planning works");
            passed++;
            tests.push({ name: "Core Test Generation Logic", status: "PASS" });
          } else {
            console.log(
              "❌ No core tests planned (might be due to existing tests)"
            );
            // Check if it's because test already exists
            const existingTests = await agent.dbAgent.getTestFiles();
            const phoneCore = existingTests.find(
              (test) =>
                test.test_type === "core" &&
                test.filename === "phone-core.spec.js"
            );

            if (phoneCore) {
              console.log(
                "ℹ️  Reason: phone-core.spec.js already exists in database"
              );
              passed++;
              tests.push({
                name: "Core Test Generation Logic",
                status: "PASS",
                note: "Skipped due to existing test",
              });
            } else {
              failed++;
              tests.push({
                name: "Core Test Generation Logic",
                status: "FAIL",
                error: "No core tests planned without reason",
              });
            }
          }
        } else {
          throw new Error(`Expected '${expectedType}', got '${actualType}'`);
        }

        await agent.close();
      } catch (error) {
        console.log("❌ Test 2 failed:", error.message);
        failed++;
        tests.push({
          name: "Core Test Generation Logic",
          status: "FAIL",
          error: error.message,
        });
      }

      // Test 3: Clean Database and Retry
      console.log("\n🧹 Test 3: Clean Database and Force Core Generation");
      try {
        const DatabaseAgent = require("../database/databaseAgent");
        const db = new DatabaseAgent();
        await db.initialize();

        // Clear core test records to force regeneration
        console.log("   🗑️  Clearing core test records from database...");
        await new Promise((resolve, reject) => {
          db.db.run(
            "DELETE FROM test_files WHERE test_type = 'core'",
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        console.log("   ✅ Core test records cleared");

        // Now try to generate core tests
        const agent = new TestAnalysisAgent();
        await agent.initialize();

        const phoneFields = [
          { name: "mobile", type: "tel", id: "mobile", required: true },
        ];

        const analysis = await agent.analyzeContext(
          "Force core phone validation",
          "Phone field validation test after cleanup",
          phoneFields
        );

        console.log(
          `   📋 Core tests planned after cleanup: ${analysis.testPlan.coreTests.length}`
        );

        if (analysis.testPlan.coreTests.length > 0) {
          console.log("✅ Core tests planned successfully after cleanup");

          // Execute to create the actual files
          const execution = await agent.executeTestPlan(
            analysis.testPlan,
            "Force core phone validation",
            "Phone field validation test after cleanup"
          );

          console.log(`   📁 Tests created: ${execution.created.length}`);
          console.log(`   ❌ Errors: ${execution.errors.length}`);

          if (execution.created.length > 0) {
            console.log("✅ Core test file generation successful");
            execution.created.forEach((file) => {
              console.log(`      - ${file.filename} (${file.type})`);
            });
            passed++;
            tests.push({ name: "Force Core Generation", status: "PASS" });
          } else {
            failed++;
            tests.push({
              name: "Force Core Generation",
              status: "FAIL",
              error: "No files created",
            });
          }
        } else {
          failed++;
          tests.push({
            name: "Force Core Generation",
            status: "FAIL",
            error: "No core tests planned even after cleanup",
          });
        }

        await agent.close();
        await db.close();
      } catch (error) {
        console.log("❌ Test 3 failed:", error.message);
        failed++;
        tests.push({
          name: "Force Core Generation",
          status: "FAIL",
          error: error.message,
        });
      }

      const result = {
        passed,
        failed,
        total: passed + failed,
        successRate: ((passed / (passed + failed)) * 100).toFixed(1),
        tests,
      };

      console.log(`\n📊 Core Debug Test Summary:`);
      console.log(`   Passed: ${passed} ✅`);
      console.log(`   Failed: ${failed} ❌`);
      console.log(`   Success Rate: ${result.successRate}%`);

      return result;
    } catch (error) {
      console.error("❌ Core debug test setup failed:", error.message);
      return {
        passed: 0,
        failed: 1,
        total: 1,
        successRate: "0.0",
        tests: [
          { name: "Core Debug Setup", status: "FAIL", error: error.message },
        ],
      };
    }
  }

  /**
   * Test Core Generation - memverifikasi bahwa core test generation berjalan dengan benar
   */
  async testCoreGeneration() {
    console.log("🧪 Testing Core Test Generation...");
    console.log("=".repeat(50));

    const testResults = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {},
    };

    let agent = null;

    try {
      // Initialize agent
      agent = new TestAnalysisAgent();
      await agent.initialize();

      // Test 1: Phone Field
      console.log("\n📞 Test 1: Phone Field Core Generation");
      const phoneFields = [
        { name: "mobile", type: "tel", id: "mobile", required: true },
      ];

      console.log("Fields:", phoneFields);
      const phoneGrouped = agent.groupFieldsByType(phoneFields);
      console.log("Grouped:", JSON.stringify(phoneGrouped, null, 2));

      const phoneAnalysis = await agent.analyzeContext(
        "Core phone validation",
        "Phone field must be required and validate format",
        phoneFields
      );

      console.log(
        "Core tests planned:",
        phoneAnalysis.testPlan.coreTests.length
      );
      console.log(
        "Business tests planned:",
        phoneAnalysis.testPlan.businessTests.length
      );

      const phoneTest = {
        type: "phone",
        fields: phoneFields,
        grouped: phoneGrouped,
        coreTestsPlanned: phoneAnalysis.testPlan.coreTests.length,
        businessTestsPlanned: phoneAnalysis.testPlan.businessTests.length,
        success: false,
        files: [],
        errors: [],
      };

      if (phoneAnalysis.testPlan.coreTests.length > 0) {
        console.log("✅ Phone core test will be created");
        console.log(
          "Files:",
          phoneAnalysis.testPlan.coreTests.map((t) => t.filename)
        );

        // Execute plan
        const phoneExecution = await agent.executeTestPlan(
          phoneAnalysis.testPlan,
          "Core phone validation",
          "Phone field must be required and validate format"
        );

        console.log("Execution result:");
        console.log("- Created:", phoneExecution.created.length);
        console.log("- Modified:", phoneExecution.modified.length);
        console.log("- Errors:", phoneExecution.errors.length);

        phoneTest.created = phoneExecution.created.length;
        phoneTest.modified = phoneExecution.modified.length;
        phoneTest.errors = phoneExecution.errors;
        phoneTest.success = phoneExecution.errors.length === 0;

        if (phoneExecution.created.length > 0) {
          phoneExecution.created.forEach((file) => {
            console.log(`  ✅ ${file.filename} (${file.type})`);
            phoneTest.files.push(file);
          });
        }

        if (phoneExecution.errors.length > 0) {
          phoneExecution.errors.forEach((error) => {
            console.log(`  ❌ ${error.filename}: ${error.error}`);
          });
        }
      } else {
        console.log("❌ No phone core test planned");
      }

      testResults.tests.push(phoneTest);

      // Test 2: Email Field
      console.log("\n📧 Test 2: Email Field Core Generation");
      const emailFields = [
        { name: "email", type: "email", id: "email", required: true },
      ];

      console.log("Fields:", emailFields);
      const emailGrouped = agent.groupFieldsByType(emailFields);
      console.log("Grouped:", JSON.stringify(emailGrouped, null, 2));

      const emailAnalysis = await agent.analyzeContext(
        "Core email validation",
        "Email field must be required and validate format",
        emailFields
      );

      console.log(
        "Core tests planned:",
        emailAnalysis.testPlan.coreTests.length
      );
      console.log(
        "Business tests planned:",
        emailAnalysis.testPlan.businessTests.length
      );

      const emailTest = {
        type: "email",
        fields: emailFields,
        grouped: emailGrouped,
        coreTestsPlanned: emailAnalysis.testPlan.coreTests.length,
        businessTestsPlanned: emailAnalysis.testPlan.businessTests.length,
        success: false,
        files: [],
        errors: [],
      };

      if (emailAnalysis.testPlan.coreTests.length > 0) {
        console.log("✅ Email core test will be created");
        console.log(
          "Files:",
          emailAnalysis.testPlan.coreTests.map((t) => t.filename)
        );

        // Execute plan
        const emailExecution = await agent.executeTestPlan(
          emailAnalysis.testPlan,
          "Core email validation",
          "Email field must be required and validate format"
        );

        console.log("Execution result:");
        console.log("- Created:", emailExecution.created.length);
        console.log("- Modified:", emailExecution.modified.length);
        console.log("- Errors:", emailExecution.errors.length);

        emailTest.created = emailExecution.created.length;
        emailTest.modified = emailExecution.modified.length;
        emailTest.errors = emailExecution.errors;
        emailTest.success = emailExecution.errors.length === 0;

        if (emailExecution.created.length > 0) {
          emailExecution.created.forEach((file) => {
            console.log(`  ✅ ${file.filename} (${file.type})`);
            emailTest.files.push(file);
          });
        }

        if (emailExecution.errors.length > 0) {
          emailExecution.errors.forEach((error) => {
            console.log(`  ❌ ${error.filename}: ${error.error}`);
          });
        }
      } else {
        console.log("❌ No email core test planned");
      }

      testResults.tests.push(emailTest);

      // Summary
      testResults.summary = {
        totalTests: testResults.tests.length,
        successfulTests: testResults.tests.filter((t) => t.success).length,
        failedTests: testResults.tests.filter((t) => !t.success).length,
        totalFilesCreated: testResults.tests.reduce(
          (sum, t) => sum + (t.created || 0),
          0
        ),
        totalErrors: testResults.tests.reduce(
          (sum, t) => sum + (t.errors?.length || 0),
          0
        ),
      };

      console.log("\n" + "=".repeat(50));
      console.log("🎉 Core Test Generation Test Complete!");
      console.log(
        `✅ Successful: ${testResults.summary.successfulTests}/${testResults.summary.totalTests}`
      );
      console.log(`📁 Files Created: ${testResults.summary.totalFilesCreated}`);
      console.log(`❌ Errors: ${testResults.summary.totalErrors}`);

      return testResults;
    } catch (error) {
      console.error("❌ Error:", error.message);
      console.error(error.stack);
      testResults.error = {
        message: error.message,
        stack: error.stack,
      };
      return testResults;
    } finally {
      if (agent) {
        await agent.close();
      }
    }
  }

  /**
   * Sync Database dengan File System
   */
  async syncDatabaseFileSystem() {
    console.log("🔄 Running Database-Filesystem Sync...");
    console.log("=".repeat(50));

    try {
      const syncManager = new SyncManager();
      const report = await syncManager.runSync({
        removeOrphanedDb: true,
        addOrphanedFiles: false, // Biasanya tidak ingin menambah file orphan ke DB
      });

      console.log("\n📊 Sync Summary:");
      console.log(`   Scanned: ${report.summary.scanned} DB records`);
      console.log(
        `   Orphaned DB records: ${report.summary.orphanedDbRecords}`
      );
      console.log(`   Orphaned files: ${report.summary.orphanedFiles}`);
      console.log(`   Repaired: ${report.summary.repaired}`);
      console.log(`   Errors: ${report.summary.errors}`);

      return {
        success: report.summary.errors === 0,
        ...report.summary,
      };
    } catch (error) {
      console.error("❌ Sync failed:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * BA Testing Strategy Analysis
   */
  async analyzeBATestingStrategy(prDescription = null, changedFiles = []) {
    console.log("🎯 Running BA Testing Strategy Analysis...");
    console.log("=".repeat(50));

    try {
      const baManager = new BATestingManager();
      const report = await baManager.runBAAnalysis(
        prDescription || "Analysis without specific PR description",
        changedFiles
      );

      console.log("\n📊 BA Strategy Summary:");
      console.log(
        `   Impact Level: ${report.analysis.impactLevel.toUpperCase()}`
      );
      console.log(
        `   Affected Fields: ${report.analysis.fieldAnalysis.fields.length}`
      );
      console.log(
        `   Change Context: ${report.analysis.changeContext.urgency}`
      );

      return {
        success: true,
        impactLevel: report.analysis.impactLevel,
        fieldCount: report.analysis.fieldAnalysis.fields.length,
        baGuidance: report.baGuidance,
        reportPath: path.join(
          __dirname,
          "../test-results/ba-testing-strategy.json"
        ),
      };
    } catch (error) {
      console.error("❌ BA Strategy Analysis failed:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Smart Test Cleanup dengan Validation Protection
   */
  async smartTestCleanup(options = {}) {
    console.log("🧹 Running Smart Test Cleanup with Validation Protection...");
    console.log("=".repeat(50));

    try {
      const validationManager = new TestValidationManager();
      await validationManager.initialize();

      const testDirectories = [
        path.join(__dirname, "../tests/core"),
        path.join(__dirname, "../tests/business"),
      ];

      const results = {
        directories: [],
        totalScanned: 0,
        totalPreserved: 0,
        totalDeleted: 0,
        errors: [],
      };

      for (const dir of testDirectories) {
        if (fs.existsSync(dir)) {
          console.log(`\n📁 Processing directory: ${path.basename(dir)}`);

          const cleanupResult = await validationManager.smartCleanup(dir, {
            preserveValidated: true,
            removeOrphaned: true,
            backupBeforeDelete: true,
            ...options,
          });

          results.directories.push({
            directory: dir,
            ...cleanupResult,
          });

          results.totalScanned += cleanupResult.scanned;
          results.totalPreserved += cleanupResult.preserved;
          results.totalDeleted += cleanupResult.deleted;
          results.errors = results.errors.concat(cleanupResult.errors);
        }
      }

      await validationManager.close();

      console.log("\n🎉 Smart Cleanup Complete!");
      console.log(`   Total Files Scanned: ${results.totalScanned}`);
      console.log(`   Validated Tests Preserved: ${results.totalPreserved} 🔒`);
      console.log(`   Draft Tests Deleted: ${results.totalDeleted} 🗑️`);
      console.log(`   Errors: ${results.errors.length}`);

      return {
        success: results.errors.length === 0,
        ...results,
      };
    } catch (error) {
      console.error("❌ Smart cleanup failed:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * List Validated Tests
   */
  async listValidatedTests() {
    console.log("📋 Listing All Validated Tests...");
    console.log("=".repeat(50));

    try {
      const validationManager = new TestValidationManager();
      await validationManager.initialize();

      const validatedTests = await validationManager.listValidatedTests();
      await validationManager.close();

      return {
        success: true,
        count: validatedTests.length,
        tests: validatedTests,
      };
    } catch (error) {
      console.error("❌ List validated tests failed:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Validate a test file
   */
  async validateTestFile() {
    console.log("\n🔒 Validating test file...");

    try {
      const args = process.argv.slice(2);
      const fileIndex = args.indexOf("--file");
      const descIndex = args.indexOf("--desc");
      const byIndex = args.indexOf("--by");

      const fileName = fileIndex !== -1 ? args[fileIndex + 1] : null;
      const description =
        descIndex !== -1
          ? args[descIndex + 1]
          : "Test validated via unified runner";
      const validatedBy = byIndex !== -1 ? args[byIndex + 1] : "developer";

      if (!fileName) {
        console.log("❌ Please provide --file parameter");
        return {
          success: false,
          error: "File parameter required",
        };
      }

      // Find file path
      const coreTestsDir = path.join(__dirname, "../tests/core");
      const businessTestsDir = path.join(__dirname, "../tests/business");

      const possiblePaths = [
        path.join(coreTestsDir, fileName),
        path.join(businessTestsDir, fileName),
        fileName, // If full path provided
      ];

      const filePath = possiblePaths.find((p) => fs.existsSync(p));

      if (!filePath) {
        console.log(`❌ Test file not found: ${fileName}`);
        return {
          success: false,
          error: `File not found: ${fileName}`,
        };
      }

      const validationManager = new TestValidationManager();
      await validationManager.initialize();

      const result = await validationManager.validateTestFile(
        filePath,
        validatedBy,
        description
      );

      if (result.success) {
        console.log("✅ Test file validated successfully");
        return {
          success: true,
          filePath: result.filepath,
          validatedBy: result.validatedBy,
          backupCreated: result.backupCreated,
        };
      } else {
        console.log(`❌ Validation failed: ${result.error}`);
        return {
          success: false,
          error: result.error,
        };
      }
    } catch (error) {
      console.error("❌ Validate test file failed:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Recover a validated test file
   */
  async recoverTestFile() {
    console.log("\n🔄 Recovering test file...");

    try {
      const args = process.argv.slice(2);
      const fileIndex = args.indexOf("--file");

      const fileName = fileIndex !== -1 ? args[fileIndex + 1] : null;

      if (!fileName) {
        console.log("❌ Please provide --file parameter");
        return {
          success: false,
          error: "File parameter required",
        };
      }

      const validationManager = new TestValidationManager();
      await validationManager.initialize();

      // Query database directly for the backup
      const db = validationManager.db;
      const query =
        "SELECT * FROM test_validations WHERE filename = ? AND validation_status = 'validated' ORDER BY validated_at DESC LIMIT 1";

      const result = await new Promise((resolve, reject) => {
        db.db.get(query, [fileName], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!result) {
        console.log(`❌ No validated backup found for: ${fileName}`);
        return {
          success: false,
          error: `No backup found for ${fileName}`,
        };
      }

      // Determine target path
      const targetPath = result.filepath.startsWith("/")
        ? result.filepath
        : path.join(__dirname, "..", result.filepath);

      // Ensure directory exists
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Restore file from backup
      fs.writeFileSync(targetPath, result.file_content_backup, "utf8");

      console.log(`✅ Test file recovered successfully`);
      console.log(`   📄 File: ${fileName}`);
      console.log(`   📁 Path: ${targetPath}`);
      console.log(`   👤 Originally validated by: ${result.validated_by}`);
      console.log(`   📝 Notes: ${result.validation_notes}`);

      return {
        success: true,
        fileName: fileName,
        filepath: targetPath,
        validatedBy: result.validated_by,
        notes: result.validation_notes,
      };
    } catch (error) {
      console.error("❌ Recover test file failed:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Batch validate test files
   */
  async batchValidateTests() {
    console.log("\n🔄 Batch validating test files...");

    try {
      const args = process.argv.slice(2);
      const patternIndex = args.indexOf("--pattern");
      const descIndex = args.indexOf("--desc");
      const byIndex = args.indexOf("--by");

      const pattern = patternIndex !== -1 ? args[patternIndex + 1] : "*";
      const description =
        descIndex !== -1
          ? args[descIndex + 1]
          : "Batch validated via unified runner";
      const validatedBy = byIndex !== -1 ? args[byIndex + 1] : "developer";

      // Find all test files matching pattern
      const coreTestsDir = path.join(__dirname, "../tests/core");
      const businessTestsDir = path.join(__dirname, "../tests/business");

      const allTestFiles = [];

      // Collect files from core directory
      if (fs.existsSync(coreTestsDir)) {
        const coreFiles = fs
          .readdirSync(coreTestsDir)
          .filter((file) => file.endsWith(".spec.js"))
          .filter((file) => pattern === "*" || file.includes(pattern))
          .map((file) => path.join(coreTestsDir, file));
        allTestFiles.push(...coreFiles);
      }

      // Collect files from business directory
      if (fs.existsSync(businessTestsDir)) {
        const businessFiles = fs
          .readdirSync(businessTestsDir)
          .filter((file) => file.endsWith(".spec.js"))
          .filter((file) => pattern === "*" || file.includes(pattern))
          .map((file) => path.join(businessTestsDir, file));
        allTestFiles.push(...businessFiles);
      }

      if (allTestFiles.length === 0) {
        console.log(`❌ No test files found matching pattern: ${pattern}`);
        return {
          success: false,
          error: `No files found matching pattern: ${pattern}`,
        };
      }

      const validationManager = new TestValidationManager();
      await validationManager.initialize();

      console.log(
        `📁 Found ${allTestFiles.length} test files matching pattern: ${pattern}`
      );

      const results = {
        successful: [],
        failed: [],
      };

      // Validate each file
      for (const filePath of allTestFiles) {
        try {
          const result = await validationManager.validateTestFile(
            filePath,
            validatedBy,
            description
          );

          if (result.success) {
            results.successful.push(filePath);
          } else {
            results.failed.push({ filepath: filePath, error: result.error });
          }
        } catch (error) {
          results.failed.push({ filepath: filePath, error: error.message });
        }
      }

      console.log(`\n✅ Batch validation completed:`);
      console.log(
        `   Successful: ${results.successful.length} tests validated`
      );
      console.log(`   Failed: ${results.failed.length} tests failed`);

      return {
        success: true,
        successful: results.successful,
        failed: results.failed,
        total: allTestFiles.length,
      };
    } catch (error) {
      console.error("❌ Batch validate tests failed:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Complete cleanup - remove ALL tests, database, and backups
   */
  async completeCleanup() {
    console.log(
      "🧹 Starting COMPLETE CLEANUP - removing all tests, database, and backups..."
    );
    console.log("⚠️  WARNING: This will permanently delete:");
    console.log("   - All test files (core and business)");
    console.log("   - Test metadata database");
    console.log("   - All backup files");
    console.log("   - Test results");

    const results = {
      success: false,
      filesDeleted: 0,
      directoriesCleared: 0,
      errors: [],
    };

    try {
      const fs = require("fs");
      const path = require("path");

      // Define paths to clean
      const pathsToClean = [
        path.join(__dirname, "../tests/core"),
        path.join(__dirname, "../tests/business"),
        path.join(__dirname, "../test-backups"),
        path.join(__dirname, "../test-results"),
        path.join(__dirname, "../database/test_metadata.db"),
        path.join(__dirname, "../database/test_metadata_test.db"),
      ];

      for (const targetPath of pathsToClean) {
        try {
          if (fs.existsSync(targetPath)) {
            const stat = fs.lstatSync(targetPath);

            if (stat.isDirectory()) {
              // Clear directory contents but keep the directory
              const files = fs.readdirSync(targetPath);
              for (const file of files) {
                const filePath = path.join(targetPath, file);
                const fileStat = fs.lstatSync(filePath);

                if (fileStat.isDirectory()) {
                  fs.rmSync(filePath, { recursive: true, force: true });
                } else {
                  fs.unlinkSync(filePath);
                }
                results.filesDeleted++;
              }
              results.directoriesCleared++;
              console.log(
                `✅ Cleared directory: ${targetPath} (${files.length} items)`
              );
            } else {
              // Delete file
              fs.unlinkSync(targetPath);
              results.filesDeleted++;
              console.log(`✅ Deleted file: ${targetPath}`);
            }
          } else {
            console.log(`⏭️  Path not found (already clean): ${targetPath}`);
          }
        } catch (error) {
          console.error(`❌ Error cleaning ${targetPath}:`, error.message);
          results.errors.push({ path: targetPath, error: error.message });
        }
      }

      results.success = results.errors.length === 0;

      console.log("\n🎉 COMPLETE CLEANUP FINISHED!");
      console.log(`📊 Summary:`);
      console.log(`   Files deleted: ${results.filesDeleted}`);
      console.log(`   Directories cleared: ${results.directoriesCleared}`);
      console.log(`   Errors: ${results.errors.length}`);

      if (results.errors.length > 0) {
        console.log("\n❌ Errors encountered:");
        results.errors.forEach((error) => {
          console.log(`   ${error.path}: ${error.error}`);
        });
      }

      console.log(
        "\n✨ System is now completely clean and ready for fresh start!"
      );
    } catch (error) {
      console.error("❌ Complete cleanup failed:", error.message);
      results.success = false;
      results.errors.push({ general: error.message });
    }

    return results;
  }

  /**
   * Run specific test suite
   */
  async runTest(testType) {
    console.log(`\n🎯 Running ${testType.toUpperCase()} tests...`);

    switch (testType.toLowerCase()) {
      case "database":
        this.results.database = await this.testDatabaseAgent();
        break;
      case "analysis":
        this.results.analysis = await this.testAnalysisAgent();
        break;
      case "e2e":
        this.results.e2e = await this.testE2EPipeline();
        break;
      case "debug-core":
        this.results.debugCore = await this.debugCoreTests();
        break;
      case "test-core-gen":
        this.results.testCoreGen = await this.testCoreGeneration();
        break;
      case "sync":
        this.results.sync = await this.syncDatabaseFileSystem();
        break;
      case "ba-strategy":
        this.results.baStrategy = await this.analyzeBATestingStrategy();
        break;
      case "cleanup":
        this.results.cleanup = await this.smartTestCleanup();
        break;
      case "clean-all":
        this.results.cleanAll = await this.completeCleanup();
        break;
      case "run-playwright":
        this.results.runPlaywright = await this.runPlaywrightTests();
        break;
      case "list-validated":
        this.results.listValidated = await this.listValidatedTests();
        break;
      case "validate":
        this.results.validate = await this.validateTestFile();
        break;
      case "recover":
        this.results.recover = await this.recoverTestFile();
        break;
      case "batch-validate":
        this.results.batchValidate = await this.batchValidateTests();
        break;
      case "backup-config":
        this.results.backupConfig = await this.showBackupConfig();
        break;
      case "backup-cleanup":
        this.results.backupCleanup = await this.performBackupCleanup();
        break;
      case "all":
        this.results.database = await this.testDatabaseAgent();
        this.results.analysis = await this.testAnalysisAgent();
        this.results.e2e = await this.testE2EPipeline();
        break;
      default:
        throw new Error(`Unknown test type: ${testType}`);
    }
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    console.log("\n" + "=".repeat(60));
    console.log("🎉 UNIFIED TEST RUNNER SUMMARY REPORT");
    console.log("=".repeat(60));

    let totalPassed = 0;
    let totalFailed = 0;
    let totalTests = 0;

    // Database Results
    if (this.results.database) {
      console.log("\n🗄️  Database Agent:");
      console.log(`   Tests: ${this.results.database.total}`);
      console.log(`   Passed: ${this.results.database.passed} ✅`);
      console.log(`   Failed: ${this.results.database.failed} ❌`);
      console.log(`   Success Rate: ${this.results.database.successRate}%`);

      totalPassed += this.results.database.passed;
      totalFailed += this.results.database.failed;
      totalTests += this.results.database.total;
    }

    // Analysis Results
    if (this.results.analysis) {
      console.log("\n🧠 Analysis Agent:");
      console.log(`   Tests: ${this.results.analysis.total}`);
      console.log(`   Passed: ${this.results.analysis.passed} ✅`);
      console.log(`   Failed: ${this.results.analysis.failed} ❌`);
      console.log(`   Success Rate: ${this.results.analysis.successRate}%`);

      totalPassed += this.results.analysis.passed;
      totalFailed += this.results.analysis.failed;
      totalTests += this.results.analysis.total;
    }

    // E2E Results
    if (this.results.e2e) {
      console.log("\n🚀 E2E Pipeline:");
      console.log(`   Tests: ${this.results.e2e.total}`);
      console.log(`   Passed: ${this.results.e2e.passed} ✅`);
      console.log(`   Failed: ${this.results.e2e.failed} ❌`);
      console.log(`   Success Rate: ${this.results.e2e.successRate}%`);

      totalPassed += this.results.e2e.passed;
      totalFailed += this.results.e2e.failed;
      totalTests += this.results.e2e.total;
    }

    // Debug Core Results
    if (this.results.debugCore) {
      console.log("\n🔧 Core Debug:");
      console.log(`   Tests: ${this.results.debugCore.total}`);
      console.log(`   Passed: ${this.results.debugCore.passed} ✅`);
      console.log(`   Failed: ${this.results.debugCore.failed} ❌`);
      console.log(`   Success Rate: ${this.results.debugCore.successRate}%`);

      totalPassed += this.results.debugCore.passed;
      totalFailed += this.results.debugCore.failed;
      totalTests += this.results.debugCore.total;
    }

    // Test Core Generation Results
    if (this.results.testCoreGen) {
      console.log("\n🧪 Core Generation Test:");
      console.log(`   Tests: ${this.results.testCoreGen.summary.totalTests}`);
      console.log(
        `   Successful: ${this.results.testCoreGen.summary.successfulTests} ✅`
      );
      console.log(
        `   Failed: ${this.results.testCoreGen.summary.failedTests} ❌`
      );
      console.log(
        `   Files Created: ${this.results.testCoreGen.summary.totalFilesCreated}`
      );
      console.log(`   Errors: ${this.results.testCoreGen.summary.totalErrors}`);

      totalPassed += this.results.testCoreGen.summary.successfulTests;
      totalFailed += this.results.testCoreGen.summary.failedTests;
      totalTests += this.results.testCoreGen.summary.totalTests;
    }

    // Overall Summary
    const overallSuccessRate =
      totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : "0.0";

    console.log("\n" + "=".repeat(40));
    console.log("📊 OVERALL SUMMARY:");
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Total Passed: ${totalPassed} ✅`);
    console.log(`   Total Failed: ${totalFailed} ❌`);
    console.log(`   Overall Success Rate: ${overallSuccessRate}%`);
    console.log("=".repeat(40));

    // Save results to file
    const reportPath = path.join(
      __dirname,
      "../test-results/unified-test-results.json"
    );
    const reportData = {
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: {
        totalTests,
        totalPassed,
        totalFailed,
        overallSuccessRate,
      },
    };

    // Ensure results directory exists
    const resultsDir = path.dirname(reportPath);
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`\n💾 Detailed results saved to: ${reportPath}`);

    return reportData;
  }

  /**
   * Show help information
   */
  showHelp() {
    console.log("\n🎯 Unified Test Runner - Help");
    console.log("=".repeat(40));
    console.log("Usage: node unified-test-runner.js [options]");
    console.log("\nOptions:");
    console.log("  --database       Test Database Agent functionality");
    console.log("  --analysis       Test Analysis Agent functionality");
    console.log("  --e2e            Test End-to-End Pipeline");
    console.log("  --debug-core     Debug core test generation issues");
    console.log("  --test-core-gen  Test core test generation functionality");
    console.log("  --sync           Sync database with file system");
    console.log("  --ba-strategy    Analyze BA testing strategy");
    console.log(
      "  --cleanup        Smart test cleanup (preserve validated tests)"
    );
    console.log(
      "  --clean-all      Complete cleanup (remove all tests, database, backups)"
    );
    console.log("  --run-playwright Run Playwright tests on generated files");
    console.log("  --list-validated List all validated tests");
    console.log("  --validate       Validate and backup a test file");
    console.log("  --recover        Recover validated test from backup");
    console.log("  --batch-validate Batch validate multiple tests");
    console.log("  --all            Run all tests");
    console.log("  --help           Show this help message");
    console.log("\nValidation Examples:");
    console.log(
      "  node unified-test-runner.js --validate --file phone-core.spec.js --desc 'Phone validation working'"
    );
    console.log(
      "  node unified-test-runner.js --recover --file email-core.spec.js"
    );
    console.log(
      "  node unified-test-runner.js --batch-validate --pattern '*-core'"
    );
    console.log("\nExamples:");
    console.log("  node unified-test-runner.js --database");
    console.log("  node unified-test-runner.js --analysis");
    console.log("  node unified-test-runner.js --e2e");
    console.log("  node unified-test-runner.js --debug-core");
    console.log("  node unified-test-runner.js --test-core-gen");
    console.log("  node unified-test-runner.js --sync");
    console.log("  node unified-test-runner.js --ba-strategy");
    console.log("  node unified-test-runner.js --cleanup");
    console.log("  node unified-test-runner.js --clean-all");
    console.log("  node unified-test-runner.js --run-playwright");
    console.log("  node unified-test-runner.js --list-validated");
    console.log("  node unified-test-runner.js --all");
  }

  /**
   * Run Playwright tests on generated test files
   */
  async runPlaywrightTests() {
    console.log("🎭 Running Playwright Tests on Generated Files...");

    const results = {
      success: false,
      testsRun: 0,
      testsPassed: 0,
      testsFailed: 0,
      errors: [],
      executionTime: 0,
    };

    try {
      const fs = require("fs");
      const path = require("path");
      const { execSync } = require("child_process");

      const coreTestDir = path.join(__dirname, "../tests/core");
      const businessTestDir = path.join(__dirname, "../tests/business");

      // Check if we have TypeScript test files
      const coreFiles = fs.existsSync(coreTestDir)
        ? fs.readdirSync(coreTestDir).filter((f) => f.endsWith(".ts"))
        : [];
      const businessFiles = fs.existsSync(businessTestDir)
        ? fs.readdirSync(businessTestDir).filter((f) => f.endsWith(".ts"))
        : [];

      const totalFiles = coreFiles.length + businessFiles.length;

      if (totalFiles === 0) {
        console.log("⚠️  No TypeScript test files found to run");
        results.success = true; // Not an error, just no tests
        return results;
      }

      console.log(`📊 Found ${totalFiles} TypeScript test files:`);
      coreFiles.forEach((file) => console.log(`   📝 Core: ${file}`));
      businessFiles.forEach((file) => console.log(`   📝 Business: ${file}`));

      // Ensure playwright config exists
      const playwrightConfigPath = path.join(
        __dirname,
        "../playwright.config.js"
      );
      if (!fs.existsSync(playwrightConfigPath)) {
        console.log("📋 Creating Playwright configuration...");
        const playwrightConfig = `
module.exports = {
  testDir: './tests',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...require('@playwright/test').devices['Desktop Chrome'] },
    },
  ],
};
`;
        fs.writeFileSync(playwrightConfigPath, playwrightConfig);
        console.log("✅ Playwright configuration created");
      }

      const startTime = Date.now();

      // Run playwright tests
      console.log("🚀 Running Playwright tests...");

      try {
        const output = execSync("npx playwright test --reporter=json", {
          cwd: path.join(__dirname, ".."),
          encoding: "utf8",
          stdio: "pipe",
        });

        // Parse JSON output if available
        try {
          const testResults = JSON.parse(output);
          results.testsRun = testResults.stats?.total || 0;
          results.testsPassed = testResults.stats?.passed || 0;
          results.testsFailed = testResults.stats?.failed || 0;
        } catch (parseError) {
          console.log(
            "⚠️  Could not parse test results, running with basic output"
          );
        }

        results.success = true;
        console.log("✅ Playwright tests completed successfully");
      } catch (execError) {
        // Even if tests fail, it's not necessarily an error in our system
        console.log("⚠️  Some tests may have failed, but execution completed");
        console.log("Error output:", execError.stdout || execError.message);
        results.errors.push({ playwright: execError.message });
        results.success = false; // Mark as failed if Playwright itself failed
      }

      results.executionTime = Date.now() - startTime;

      console.log("\n🎭 Playwright Test Summary:");
      console.log(`   Tests run: ${results.testsRun}`);
      console.log(`   Tests passed: ${results.testsPassed}`);
      console.log(`   Tests failed: ${results.testsFailed}`);
      console.log(`   Execution time: ${results.executionTime}ms`);
    } catch (error) {
      console.error("❌ Failed to run Playwright tests:", error.message);
      results.success = false;
      results.errors.push({ general: error.message });
    }

    return results;
  }

  // ...existing code...
}

// CLI Handler
async function main() {
  const args = process.argv.slice(2);
  const runner = new UnifiedTestRunner();

  if (args.length === 0 || args.includes("--help")) {
    runner.showHelp();
    return;
  }

  try {
    if (args.includes("--database")) {
      await runner.runTest("database");
    }

    if (args.includes("--analysis")) {
      await runner.runTest("analysis");
    }

    if (args.includes("--e2e")) {
      await runner.runTest("e2e");
    }

    if (args.includes("--debug-core")) {
      await runner.runTest("debug-core");
    }

    if (args.includes("--test-core-gen")) {
      await runner.runTest("test-core-gen");
    }

    if (args.includes("--sync")) {
      await runner.runTest("sync");
    }

    if (args.includes("--ba-strategy")) {
      await runner.runTest("ba-strategy");
    }

    if (args.includes("--cleanup")) {
      await runner.runTest("cleanup");
    }

    if (args.includes("--clean-all")) {
      await runner.runTest("clean-all");
    }

    if (args.includes("--run-playwright")) {
      await runner.runTest("run-playwright");
    }

    if (args.includes("--list-validated")) {
      await runner.runTest("list-validated");
    }

    if (args.includes("--validate")) {
      await runner.runTest("validate");
    }

    if (args.includes("--recover")) {
      await runner.runTest("recover");
    }

    if (args.includes("--batch-validate")) {
      await runner.runTest("batch-validate");
    }

    if (args.includes("--backup-config")) {
      await runner.runTest("backup-config");
    }

    if (args.includes("--backup-cleanup")) {
      await runner.runTest("backup-cleanup");
    }

    if (args.includes("--all")) {
      await runner.runTest("all");
    }

    // Generate final report
    runner.generateReport();
  } catch (error) {
    console.error("\n❌ Test execution failed:", error.message);
    process.exit(1);
  }
}

// Export for programmatic use
module.exports = UnifiedTestRunner;

// Run CLI if called directly
if (require.main === module) {
  main();
}
