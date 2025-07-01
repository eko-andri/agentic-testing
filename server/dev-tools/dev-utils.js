/**
 * Development Test Utilities
 * Helper functions untuk testing dan development
 */

const { Orchestrator } = require("../orchestrator");
const DatabaseAgent = require("../database/databaseAgent");
const TestAnalysisAgent = require("../testAnalysisAgent");

class DevTestUtils {
  /**
   * Quick test untuk memverifikasi sistem bekerja
   */
  static async quickHealthCheck() {
    console.log("🏥 Quick Health Check...");

    const results = {
      database: false,
      orchestrator: false,
      testAnalysis: false,
    };

    try {
      // Test Database
      const db = new DatabaseAgent();
      await db.initialize();
      const stats = await db.getStats();
      results.database = typeof stats.total_contexts === "number";
      await db.close();
      console.log("✅ Database: OK");
    } catch (error) {
      console.log("❌ Database: FAIL -", error.message);
    }

    try {
      // Test Orchestrator
      const orchestrator = new Orchestrator();
      results.orchestrator =
        typeof orchestrator.analyzeLiveFormStructure === "function";
      console.log("✅ Orchestrator: OK");
    } catch (error) {
      console.log("❌ Orchestrator: FAIL -", error.message);
    }

    try {
      // Test Analysis Agent
      const agent = new TestAnalysisAgent();
      results.testAnalysis = typeof agent.analyzeContext === "function";
      await agent.close();
      console.log("✅ Test Analysis: OK");
    } catch (error) {
      console.log("❌ Test Analysis: FAIL -", error.message);
    }

    const allHealthy = Object.values(results).every((r) => r === true);
    console.log(
      `\n🎯 Overall Health: ${allHealthy ? "✅ HEALTHY" : "❌ ISSUES DETECTED"}`
    );

    return results;
  }

  /**
   * Cepat test context analysis
   */
  static async quickContextTest(description = "Test email validation") {
    console.log("🧪 Quick Context Test...");

    const agent = new TestAnalysisAgent();
    const mockFields = [
      { name: "email", type: "email", id: "email", required: true },
    ];

    const context = {
      description,
      acceptanceCriteria: "Email should be valid format",
      relevantFields: ["email"],
    };

    try {
      const result = await agent.analyzeContext(mockFields, context);
      console.log("✅ Context analysis successful");
      console.log("   Relevant fields:", result.relevantFields?.length || 0);
      await agent.close();
      return result;
    } catch (error) {
      console.log("❌ Context analysis failed:", error.message);
      await agent.close();
      throw error;
    }
  }

  /**
   * Clean up test files yang lama
   */
  static async cleanupOldTests(daysOld = 7) {
    console.log(`🧹 Cleaning up test files older than ${daysOld} days...`);

    const fs = require("fs");
    const path = require("path");

    const testDirs = [
      path.join(__dirname, "../tests/business"),
      path.join(__dirname, "../tests/core"),
      path.join(__dirname, "../test-results"),
    ];

    let cleaned = 0;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    for (const dir of testDirs) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);

        for (const file of files) {
          const filePath = path.join(dir, file);
          const stats = fs.statSync(filePath);

          if (stats.mtime < cutoffDate) {
            try {
              fs.unlinkSync(filePath);
              console.log(`🗑️  Deleted: ${file}`);
              cleaned++;
            } catch (error) {
              console.log(`❌ Failed to delete ${file}:`, error.message);
            }
          }
        }
      }
    }

    console.log(`✅ Cleanup complete. Removed ${cleaned} files.`);
    return cleaned;
  }

  /**
   * Reset database untuk testing
   */
  static async resetDatabase() {
    console.log("🔄 Resetting database...");

    const db = new DatabaseAgent();
    await db.initialize();

    // Clear all tables
    const tables = [
      "test_files",
      "test_contexts",
      "test_executions",
      "form_fields",
      "test_context_relations",
    ];

    for (const table of tables) {
      try {
        await new Promise((resolve, reject) => {
          db.db.run(`DELETE FROM ${table}`, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        console.log(`✅ Cleared table: ${table}`);
      } catch (error) {
        console.log(`❌ Failed to clear ${table}:`, error.message);
      }
    }

    await db.close();
    console.log("✅ Database reset complete");
  }

  /**
   * Generate sample test data
   */
  static async generateSampleData() {
    console.log("📊 Generating sample test data...");

    const db = new DatabaseAgent();
    await db.initialize();

    const sampleContexts = [
      {
        description: "Email validation testing",
        acceptanceCriteria: "Email should follow standard format",
        testType: "validation",
        priority: "high",
      },
      {
        description: "Password strength validation",
        acceptanceCriteria: "Password should meet security requirements",
        testType: "security",
        priority: "high",
      },
      {
        description: "Form submission testing",
        acceptanceCriteria: "Form should submit successfully with valid data",
        testType: "integration",
        priority: "medium",
      },
    ];

    for (const context of sampleContexts) {
      try {
        const id = await db.upsertTestContext(context);
        console.log(`✅ Created context: ${context.description} (ID: ${id})`);
      } catch (error) {
        console.log(`❌ Failed to create context: ${error.message}`);
      }
    }

    await db.close();
    console.log("✅ Sample data generation complete");
  }
}

module.exports = DevTestUtils;
