#!/usr/bin/env node

/**
 * Test Validation & Recovery Manager
 * System untuk manage test files dengan validation flags dan recovery mechanism
 *
 * Features:
 * - Mark test sebagai "validated" (protected dari deletion)
 * - Backup validated tests ke database
 * - Recovery mechanism untuk validated tests yang terhapus
 * - Smart cleanup yang preserve validated tests
 */

const DatabaseAgent = require("../database/databaseAgent");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

class TestValidationManager {
  constructor(options = {}) {
    this.db = null;
    this.validatedTestsCache = new Map();
    this.backupStorage = path.join(__dirname, "../test-backups");

    // Configuration options for backup strategy
    this.config = {
      enablePhysicalBackup: options.enablePhysicalBackup !== false, // default true
      maxPhysicalBackups: options.maxPhysicalBackups || 3, // keep last 3 versions per file
      physicalBackupForValidatedOnly:
        options.physicalBackupForValidatedOnly !== false, // default true
      autoCleanupDays: options.autoCleanupDays || 30, // cleanup files older than 30 days
    };

    // Create backup directory only if physical backup is enabled
    if (
      this.config.enablePhysicalBackup &&
      !fs.existsSync(this.backupStorage)
    ) {
      fs.mkdirSync(this.backupStorage, { recursive: true });
    }
  }

  async initialize() {
    console.log("🔧 Initializing Test Validation Manager...");
    this.db = new DatabaseAgent();
    await this.db.initialize();

    // Load validated tests cache
    await this.loadValidatedTestsCache();
  }

  /**
   * Load cache of validated tests from database
   */
  async loadValidatedTestsCache() {
    try {
      // Check if validation table exists, if not create it
      await this.ensureValidationTableExists();

      const validatedTests = await this.getValidatedTests();
      validatedTests.forEach((test) => {
        this.validatedTestsCache.set(test.filepath, test);
      });

      console.log(
        `   Loaded ${validatedTests.length} validated tests to cache`
      );
    } catch (error) {
      console.log(
        `   Warning: Could not load validated tests cache: ${error.message}`
      );
    }
  }

  /**
   * Ensure validation table exists in database
   */
  async ensureValidationTableExists() {
    return new Promise((resolve, reject) => {
      const createTableSQL = `
                CREATE TABLE IF NOT EXISTS test_validations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    test_file_id INTEGER,
                    filepath TEXT NOT NULL,
                    filename TEXT NOT NULL,
                    validation_status TEXT DEFAULT 'draft', -- 'draft', 'validated', 'deprecated'
                    validated_by TEXT,
                    validated_at DATETIME,
                    file_content_backup TEXT, -- Full backup of validated test content
                    file_hash TEXT, -- Hash untuk detect changes
                    validation_notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (test_file_id) REFERENCES test_files(id),
                    UNIQUE(filepath)
                )
            `;

      this.db.db.exec(createTableSQL, (err) => {
        if (err) {
          reject(
            new Error(`Failed to create validation table: ${err.message}`)
          );
          return;
        }
        resolve();
      });
    });
  }

  /**
   * Mark test file sebagai validated
   */
  async validateTestFile(filepath, validatedBy = "developer", notes = "") {
    console.log(`🔒 Validating test file: ${path.basename(filepath)}`);

    try {
      // Check if file exists
      if (!fs.existsSync(filepath)) {
        throw new Error(`Test file not found: ${filepath}`);
      }

      // Read file content untuk backup
      const fileContent = fs.readFileSync(filepath, "utf8");
      const fileHash = crypto
        .createHash("sha256")
        .update(fileContent)
        .digest("hex");

      // Get test_file_id from main table
      const testFiles = await this.db.getTestFiles({ filepath: filepath });
      const testFileId = testFiles.length > 0 ? testFiles[0].id : null;

      // Insert or update validation record
      const validationData = {
        test_file_id: testFileId,
        filepath: filepath,
        filename: path.basename(filepath),
        validation_status: "validated",
        validated_by: validatedBy,
        validated_at: new Date().toISOString(),
        file_content_backup: fileContent,
        file_hash: fileHash,
        validation_notes: notes,
      };

      await this.upsertValidation(validationData);

      // Create physical backup (for validated tests)
      await this.createPhysicalBackup(filepath, fileContent, true);

      // Update cache
      this.validatedTestsCache.set(filepath, validationData);

      console.log(`   ✅ Test validated and backed up successfully`);
      console.log(`   📄 File: ${path.basename(filepath)}`);
      console.log(`   👤 Validated by: ${validatedBy}`);
      console.log(`   📝 Notes: ${notes || "No notes"}`);

      return {
        success: true,
        filepath: filepath,
        validatedBy: validatedBy,
        backupCreated: true,
      };
    } catch (error) {
      console.error(`   ❌ Validation failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Upsert validation record to database
   */
  async upsertValidation(validationData) {
    return new Promise((resolve, reject) => {
      // Check if record exists
      const checkSQL = "SELECT id FROM test_validations WHERE filepath = ?";
      this.db.db.get(checkSQL, [validationData.filepath], (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row) {
          // Update existing record
          const updateSQL = `
                        UPDATE test_validations 
                        SET validation_status = ?, validated_by = ?, validated_at = ?,
                            file_content_backup = ?, file_hash = ?, validation_notes = ?,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE filepath = ?
                    `;

          this.db.db.run(
            updateSQL,
            [
              validationData.validation_status,
              validationData.validated_by,
              validationData.validated_at,
              validationData.file_content_backup,
              validationData.file_hash,
              validationData.validation_notes,
              validationData.filepath,
            ],
            function (err) {
              if (err) reject(err);
              else resolve({ id: row.id, updated: true });
            }
          );
        } else {
          // Insert new record
          const insertSQL = `
                        INSERT INTO test_validations 
                        (test_file_id, filepath, filename, validation_status, validated_by, 
                         validated_at, file_content_backup, file_hash, validation_notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;

          this.db.db.run(
            insertSQL,
            [
              validationData.test_file_id,
              validationData.filepath,
              validationData.filename,
              validationData.validation_status,
              validationData.validated_by,
              validationData.validated_at,
              validationData.file_content_backup,
              validationData.file_hash,
              validationData.validation_notes,
            ],
            function (err) {
              if (err) reject(err);
              else resolve({ id: this.lastID, created: true });
            }
          );
        }
      });
    });
  }

  /**
   * Create physical backup file (optional, configurable)
   */
  async createPhysicalBackup(filepath, content, isValidated = false) {
    // Skip physical backup if disabled
    if (!this.config.enablePhysicalBackup) {
      console.log(
        `   📁 Physical backup disabled - skipping backup for ${path.basename(
          filepath
        )}`
      );
      return null;
    }

    // Skip physical backup for draft tests if configured to backup validated only
    if (this.config.physicalBackupForValidatedOnly && !isValidated) {
      console.log(
        `   📁 Physical backup for validated only - skipping draft: ${path.basename(
          filepath
        )}`
      );
      return null;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = path.basename(filepath);
    const backupFilename = `${filename}.${timestamp}.backup`;
    const backupPath = path.join(this.backupStorage, backupFilename);

    // Create backup file
    fs.writeFileSync(backupPath, content, "utf8");

    // Cleanup old backups for this file
    this.cleanupOldBackups(filename);

    console.log(`   💾 Physical backup created: ${backupFilename}`);
    return backupPath;
  }

  /**
   * Cleanup old physical backups (keep only recent versions)
   */
  cleanupOldBackups(filename) {
    try {
      if (!fs.existsSync(this.backupStorage)) return;

      // Get all backup files for this specific file
      const backupFiles = fs
        .readdirSync(this.backupStorage)
        .filter(
          (file) => file.startsWith(filename + ".") && file.endsWith(".backup")
        )
        .map((file) => ({
          name: file,
          path: path.join(this.backupStorage, file),
          stat: fs.statSync(path.join(this.backupStorage, file)),
        }))
        .sort((a, b) => b.stat.mtime - a.stat.mtime); // Sort by modification time, newest first

      // Keep only the most recent backups
      if (backupFiles.length > this.config.maxPhysicalBackups) {
        const filesToDelete = backupFiles.slice(this.config.maxPhysicalBackups);

        filesToDelete.forEach((file) => {
          fs.unlinkSync(file.path);
          console.log(`   🧹 Cleaned up old backup: ${file.name}`);
        });
      }

      // Also cleanup files older than configured days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.autoCleanupDays);

      const allBackupFiles = fs
        .readdirSync(this.backupStorage)
        .filter((file) => file.endsWith(".backup"))
        .map((file) => ({
          name: file,
          path: path.join(this.backupStorage, file),
          stat: fs.statSync(path.join(this.backupStorage, file)),
        }))
        .filter((file) => file.stat.mtime < cutoffDate);

      allBackupFiles.forEach((file) => {
        fs.unlinkSync(file.path);
        console.log(
          `   🧹 Cleaned up old backup (${this.config.autoCleanupDays}+ days): ${file.name}`
        );
      });
    } catch (error) {
      console.log(`   ⚠️  Backup cleanup warning: ${error.message}`);
    }
  }

  /**
   * Get all validated tests
   */
  async getValidatedTests() {
    return new Promise((resolve, reject) => {
      const sql =
        "SELECT * FROM test_validations WHERE validation_status = 'validated' ORDER BY validated_at DESC";
      this.db.db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * Check if test file is validated (protected)
   */
  isTestValidated(filepath) {
    return this.validatedTestsCache.has(filepath);
  }

  /**
   * Get validated test info
   */
  getValidatedTestInfo(filepath) {
    return this.validatedTestsCache.get(filepath);
  }

  /**
   * Smart cleanup - hapus draft tests tapi preserve validated tests
   */
  async smartCleanup(testDirectory, options = {}) {
    console.log(`🧹 Starting smart cleanup of ${testDirectory}...`);

    const {
      preserveValidated = true,
      removeOrphaned = true,
      backupBeforeDelete = true,
    } = options;

    const results = {
      scanned: 0,
      deleted: 0,
      preserved: 0,
      errors: [],
    };

    try {
      if (!fs.existsSync(testDirectory)) {
        console.log(`   Directory not found: ${testDirectory}`);
        return results;
      }

      const files = fs
        .readdirSync(testDirectory)
        .filter((file) => file.endsWith(".spec.js"))
        .map((file) => path.join(testDirectory, file));

      results.scanned = files.length;
      console.log(`   Found ${files.length} test files to process`);

      for (const filepath of files) {
        try {
          const isValidated = this.isTestValidated(filepath);

          if (preserveValidated && isValidated) {
            // Preserve validated tests
            console.log(
              `   🔒 PRESERVED: ${path.basename(filepath)} (validated)`
            );
            results.preserved++;
          } else {
            // Delete draft tests
            if (backupBeforeDelete) {
              const content = fs.readFileSync(filepath, "utf8");
              await this.createPhysicalBackup(filepath, content, false); // draft test backup
            }

            fs.unlinkSync(filepath);
            console.log(`   🗑️ DELETED: ${path.basename(filepath)} (draft)`);
            results.deleted++;

            // Remove from cache if exists
            this.validatedTestsCache.delete(filepath);
          }
        } catch (error) {
          console.log(
            `   ❌ Error processing ${path.basename(filepath)}: ${
              error.message
            }`
          );
          results.errors.push({
            file: filepath,
            error: error.message,
          });
        }
      }

      console.log(`\n📊 Cleanup Summary:`);
      console.log(`   Scanned: ${results.scanned} files`);
      console.log(`   Preserved: ${results.preserved} validated tests`);
      console.log(`   Deleted: ${results.deleted} draft tests`);
      console.log(`   Errors: ${results.errors.length}`);

      return results;
    } catch (error) {
      console.error(`   ❌ Cleanup failed: ${error.message}`);
      results.errors.push({ error: error.message });
      return results;
    }
  }

  /**
   * Recover validated test dari backup
   */
  async recoverValidatedTest(filepath) {
    console.log(`🔄 Recovering validated test: ${path.basename(filepath)}`);

    try {
      const validatedTest = this.getValidatedTestInfo(filepath);

      if (!validatedTest) {
        throw new Error(`No validated backup found for: ${filepath}`);
      }

      // Create directory if doesn't exist
      const dir = path.dirname(filepath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Restore content dari backup
      fs.writeFileSync(filepath, validatedTest.file_content_backup, "utf8");

      console.log(`   ✅ Test recovered successfully`);
      console.log(`   📄 File: ${path.basename(filepath)}`);
      console.log(`   📅 Original validation: ${validatedTest.validated_at}`);
      console.log(`   👤 Validated by: ${validatedTest.validated_by}`);

      return {
        success: true,
        filepath: filepath,
        recoveredFrom: validatedTest.validated_at,
      };
    } catch (error) {
      console.error(`   ❌ Recovery failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * List all validated tests
   */
  async listValidatedTests() {
    console.log("📋 Validated Tests:");
    console.log("=".repeat(60));

    const validatedTests = await this.getValidatedTests();

    if (validatedTests.length === 0) {
      console.log("   No validated tests found");
      return [];
    }

    validatedTests.forEach((test, index) => {
      console.log(`\n${index + 1}. ${test.filename}`);
      console.log(`   📄 Path: ${test.filepath}`);
      console.log(`   👤 Validated by: ${test.validated_by}`);
      console.log(`   📅 Date: ${test.validated_at}`);
      console.log(`   📝 Notes: ${test.validation_notes || "No notes"}`);
      console.log(
        `   🔧 Status: ${
          fs.existsSync(test.filepath) ? "✅ EXISTS" : "❌ MISSING"
        }`
      );
    });

    return validatedTests;
  }

  /**
   * Batch validate multiple test files
   */
  async batchValidate(filepaths, validatedBy = "developer", notes = "") {
    console.log(`🔒 Batch validating ${filepaths.length} test files...`);

    const results = {
      successful: [],
      failed: [],
    };

    for (const filepath of filepaths) {
      const result = await this.validateTestFile(filepath, validatedBy, notes);

      if (result.success) {
        results.successful.push(filepath);
      } else {
        results.failed.push({ filepath, error: result.error });
      }
    }

    console.log(`\n📊 Batch Validation Summary:`);
    console.log(`   Successful: ${results.successful.length}`);
    console.log(`   Failed: ${results.failed.length}`);

    return results;
  }

  /**
   * Configure backup strategy
   */
  updateBackupConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };

    console.log(`🔧 Backup configuration updated:`);
    console.log(
      `   Physical Backup: ${
        this.config.enablePhysicalBackup ? "ENABLED" : "DISABLED"
      }`
    );
    console.log(`   Max Backups per file: ${this.config.maxPhysicalBackups}`);
    console.log(
      `   Validated Only: ${this.config.physicalBackupForValidatedOnly}`
    );
    console.log(`   Auto Cleanup: ${this.config.autoCleanupDays} days`);
  }

  /**
   * Get backup strategy summary
   */
  getBackupSummary() {
    const summary = {
      strategy: "Hybrid (Database + Optional Physical)",
      database: {
        enabled: true,
        storage: "SQLite test_validations table",
        features: ["Full content backup", "Metadata storage", "Fast recovery"],
      },
      physical: {
        enabled: this.config.enablePhysicalBackup,
        storage: this.backupStorage,
        validatedOnly: this.config.physicalBackupForValidatedOnly,
        maxVersions: this.config.maxPhysicalBackups,
        autoCleanup: `${this.config.autoCleanupDays} days`,
      },
    };

    return summary;
  }

  /**
   * Manual cleanup of all old backups
   */
  async performMaintenanceCleanup() {
    console.log("🧹 Performing maintenance cleanup of physical backups...");

    if (
      !this.config.enablePhysicalBackup ||
      !fs.existsSync(this.backupStorage)
    ) {
      console.log("   No physical backups to cleanup");
      return { cleaned: 0, errors: 0 };
    }

    let cleaned = 0;
    let errors = 0;

    try {
      const allBackupFiles = fs
        .readdirSync(this.backupStorage)
        .filter((file) => file.endsWith(".backup"));

      // Group by base filename
      const fileGroups = {};
      allBackupFiles.forEach((file) => {
        const baseName = file.replace(
          /\.\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.backup$/,
          ""
        );
        if (!fileGroups[baseName]) fileGroups[baseName] = [];
        fileGroups[baseName].push(file);
      });

      // Cleanup each group
      Object.keys(fileGroups).forEach((baseName) => {
        try {
          this.cleanupOldBackups(baseName);
          cleaned++;
        } catch (error) {
          console.log(`   ❌ Error cleaning up ${baseName}: ${error.message}`);
          errors++;
        }
      });
    } catch (error) {
      console.log(`   ❌ Maintenance cleanup failed: ${error.message}`);
      errors++;
    }

    console.log(
      `   ✅ Maintenance cleanup completed: ${cleaned} file groups processed, ${errors} errors`
    );
    return { cleaned, errors };
  }

  async close() {
    if (this.db) {
      await this.db.close();
    }
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes("--help")) {
    console.log("🔧 Test Validation & Recovery Manager - Help");
    console.log("Usage: node test-validation-manager.js [command] [options]");
    console.log("");
    console.log("Commands:");
    console.log("  validate <filepath>     Mark test as validated");
    console.log("  recover <filepath>      Recover validated test from backup");
    console.log("  list                    List all validated tests");
    console.log("  cleanup <directory>     Smart cleanup (preserve validated)");
    console.log("  batch-validate <dir>    Validate all tests in directory");
    console.log("");
    console.log("Options:");
    console.log('  --by "name"            Who is validating');
    console.log('  --notes "text"         Validation notes');
    console.log("  --help                 Show this help");
    console.log("");
    console.log("Examples:");
    console.log(
      "  node test-validation-manager.js validate server/tests/core/phone-core.spec.js"
    );
    console.log(
      "  node test-validation-manager.js recover server/tests/core/email-core.spec.js"
    );
    console.log(
      "  node test-validation-manager.js cleanup server/tests/business/"
    );
    console.log("  node test-validation-manager.js list");
    return;
  }

  const command = args[0];
  const target = args[1];

  const byIndex = args.indexOf("--by");
  const notesIndex = args.indexOf("--notes");

  const validatedBy = byIndex !== -1 ? args[byIndex + 1] : "developer";
  const notes = notesIndex !== -1 ? args[notesIndex + 1] : "";

  const manager = new TestValidationManager();

  async function runCommand() {
    try {
      await manager.initialize();

      switch (command) {
        case "validate":
          if (!target) {
            console.log("❌ Error: filepath required for validate command");
            return;
          }
          await manager.validateTestFile(target, validatedBy, notes);
          break;

        case "recover":
          if (!target) {
            console.log("❌ Error: filepath required for recover command");
            return;
          }
          await manager.recoverValidatedTest(target);
          break;

        case "list":
          await manager.listValidatedTests();
          break;

        case "cleanup":
          if (!target) {
            console.log("❌ Error: directory required for cleanup command");
            return;
          }
          await manager.smartCleanup(target);
          break;

        case "batch-validate":
          if (!target) {
            console.log(
              "❌ Error: directory required for batch-validate command"
            );
            return;
          }
          const files = fs
            .readdirSync(target)
            .filter((f) => f.endsWith(".spec.js"))
            .map((f) => path.join(target, f));
          await manager.batchValidate(files, validatedBy, notes);
          break;

        default:
          console.log(`❌ Unknown command: ${command}`);
          console.log("Use --help for available commands");
      }
    } catch (error) {
      console.error("❌ Command failed:", error.message);
    } finally {
      await manager.close();
    }
  }

  runCommand();
}

module.exports = TestValidationManager;
