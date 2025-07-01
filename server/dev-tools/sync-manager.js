#!/usr/bin/env node

/**
 * Database-Filesystem Sync Manager
 * Mengatasi masalah sinkronisasi antara database dan file system
 * untuk Agentic Testing System
 */

const DatabaseAgent = require("../database/databaseAgent");
const fs = require("fs");
const path = require("path");

class SyncManager {
  constructor() {
    this.db = null;
    this.results = {
      scanned: 0,
      orphanedDbRecords: [],
      orphanedFiles: [],
      repaired: 0,
      errors: [],
    };
  }

  async initialize() {
    console.log("🔄 Initializing Database-Filesystem Sync Manager...");
    this.db = new DatabaseAgent();
    await this.db.initialize();
  }

  /**
   * Scan dan deteksi inconsistency antara database dan file system
   */
  async scanInconsistencies() {
    console.log("\n🔍 Scanning for inconsistencies...");

    // Get all test files from database
    const dbTests = await this.db.getTestFiles();
    console.log(`📊 Found ${dbTests.length} test records in database`);

    this.results.scanned = dbTests.length;

    // Check each database record
    for (const test of dbTests) {
      const filePath = test.filepath;
      const exists = fs.existsSync(filePath);

      if (!exists) {
        console.log(`❌ Orphaned DB record: ${test.filename} → ${filePath}`);
        this.results.orphanedDbRecords.push({
          id: test.id,
          filename: test.filename,
          filepath: filePath,
          test_type: test.test_type,
        });
      }
    }

    // Scan for orphaned files (files exist but not in database)
    await this.scanOrphanedFiles();

    console.log(`\n📊 Scan Results:`);
    console.log(`   Total DB records: ${this.results.scanned}`);
    console.log(
      `   Orphaned DB records: ${this.results.orphanedDbRecords.length}`
    );
    console.log(`   Orphaned files: ${this.results.orphanedFiles.length}`);
  }

  /**
   * Scan for files that exist but not in database
   */
  async scanOrphanedFiles() {
    const testDirs = [
      path.join(__dirname, "../tests/core"),
      path.join(__dirname, "../tests/business"),
    ];

    for (const dir of testDirs) {
      if (!fs.existsSync(dir)) continue;

      const files = fs
        .readdirSync(dir)
        .filter((file) => file.endsWith(".spec.js"))
        .map((file) => path.join(dir, file));

      for (const filePath of files) {
        // Check if file exists in database
        const dbRecord = await this.db.getTestFiles({ filepath: filePath });

        if (dbRecord.length === 0) {
          console.log(`📄 Orphaned file: ${path.basename(filePath)}`);
          this.results.orphanedFiles.push({
            filepath: filePath,
            filename: path.basename(filePath),
            test_type: filePath.includes("/core/") ? "core" : "business",
          });
        }
      }
    }
  }

  /**
   * Auto-repair inconsistencies
   */
  async autoRepair(
    options = { removeOrphanedDb: true, addOrphanedFiles: false }
  ) {
    console.log("\n🔧 Starting auto-repair...");

    let repaired = 0;

    // Remove orphaned database records
    if (options.removeOrphanedDb && this.results.orphanedDbRecords.length > 0) {
      console.log(
        `\n🗑️ Removing ${this.results.orphanedDbRecords.length} orphaned DB records...`
      );

      for (const record of this.results.orphanedDbRecords) {
        try {
          await this.db.deleteTestFile(record.id);
          console.log(`   ✅ Removed DB record: ${record.filename}`);
          repaired++;
        } catch (error) {
          console.log(
            `   ❌ Failed to remove: ${record.filename} - ${error.message}`
          );
          this.results.errors.push({
            action: "remove_db_record",
            item: record.filename,
            error: error.message,
          });
        }
      }
    }

    // Add orphaned files to database (optional, biasanya tidak diinginkan)
    if (options.addOrphanedFiles && this.results.orphanedFiles.length > 0) {
      console.log(
        `\n📝 Adding ${this.results.orphanedFiles.length} orphaned files to database...`
      );

      for (const file of this.results.orphanedFiles) {
        try {
          // Basic metadata for orphaned files
          await this.db.saveTestFile({
            filename: file.filename,
            filepath: file.filepath,
            test_type: file.test_type,
            created_at: new Date().toISOString(),
            status: "unknown", // Mark as unknown since we don't have context
          });
          console.log(`   ✅ Added to DB: ${file.filename}`);
          repaired++;
        } catch (error) {
          console.log(
            `   ❌ Failed to add: ${file.filename} - ${error.message}`
          );
          this.results.errors.push({
            action: "add_db_record",
            item: file.filename,
            error: error.message,
          });
        }
      }
    }

    this.results.repaired = repaired;
    console.log(`\n✅ Auto-repair completed: ${repaired} items repaired`);
  }

  /**
   * Generate sync report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        scanned: this.results.scanned,
        orphanedDbRecords: this.results.orphanedDbRecords.length,
        orphanedFiles: this.results.orphanedFiles.length,
        repaired: this.results.repaired,
        errors: this.results.errors.length,
      },
      details: this.results,
    };

    // Save report
    const reportPath = path.join(__dirname, "../test-results/sync-report.json");
    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n💾 Sync report saved: ${reportPath}`);
    } catch (error) {
      console.log(`\n❌ Failed to save report: ${error.message}`);
    }

    return report;
  }

  async close() {
    if (this.db) {
      await this.db.close();
    }
  }

  /**
   * Main sync workflow
   */
  async runSync(options = {}) {
    try {
      await this.initialize();
      await this.scanInconsistencies();

      if (
        this.results.orphanedDbRecords.length > 0 ||
        this.results.orphanedFiles.length > 0
      ) {
        await this.autoRepair(options);
      } else {
        console.log("\n✅ No inconsistencies found - system is in sync!");
      }

      return this.generateReport();
    } catch (error) {
      console.error("\n❌ Sync failed:", error.message);
      throw error;
    } finally {
      await this.close();
    }
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes("--help")) {
    console.log("🔄 Database-Filesystem Sync Manager");
    console.log("Usage: node sync-manager.js [options]");
    console.log("");
    console.log("Options:");
    console.log(
      "  --scan-only     Only scan for inconsistencies, do not repair"
    );
    console.log(
      "  --add-files     Add orphaned files to database (default: false)"
    );
    console.log(
      "  --keep-db       Keep orphaned DB records (default: remove them)"
    );
    console.log("  --help          Show this help");
    console.log("");
    console.log("Examples:");
    console.log(
      "  node sync-manager.js                    # Scan and auto-repair"
    );
    console.log("  node sync-manager.js --scan-only        # Only scan");
    console.log(
      "  node sync-manager.js --add-files        # Add orphaned files to DB"
    );
    return;
  }

  const options = {
    removeOrphanedDb: !args.includes("--keep-db"),
    addOrphanedFiles: args.includes("--add-files"),
    scanOnly: args.includes("--scan-only"),
  };

  const syncManager = new SyncManager();

  if (options.scanOnly) {
    // Only scan
    syncManager
      .initialize()
      .then(() => syncManager.scanInconsistencies())
      .then(() => syncManager.generateReport())
      .then(() => syncManager.close())
      .catch(console.error);
  } else {
    // Full sync
    syncManager
      .runSync(options)
      .then((report) => {
        console.log("\n🎉 Sync completed successfully!");
        console.log(`📊 Summary: ${report.summary.repaired} items repaired`);
      })
      .catch(console.error);
  }
}

module.exports = SyncManager;
