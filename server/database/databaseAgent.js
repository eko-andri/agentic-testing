const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

class DatabaseAgent {
  constructor(dbPath = path.join(__dirname, "test_metadata.db")) {
    this.dbPath = dbPath;
    this.db = null;
    this.initialized = false;
  }

  /**
   * Initialize database connection and create tables
   */
  async initialize() {
    if (this.initialized) return;

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(new Error(`Failed to connect to database: ${err.message}`));
          return;
        }

        // Read and execute schema
        const schemaPath = path.join(__dirname, "schema.sql");
        const schema = fs.readFileSync(schemaPath, "utf8");

        this.db.exec(schema, (err) => {
          if (err) {
            reject(
              new Error(`Failed to initialize database schema: ${err.message}`)
            );
            return;
          }
          this.initialized = true;
          console.log("Database initialized successfully");
          resolve();
        });
      });
    });
  }

  /**
   * Close database connection
   */
  async close() {
    if (!this.db) return;

    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) console.error("Error closing database:", err);
        this.initialized = false;
        resolve();
      });
    });
  }

  /**
   * Generate hash for content
   */
  generateHash(content) {
    return crypto.createHash("sha256").update(content).digest("hex");
  }

  /**
   * Insert or update test file metadata
   */
  async upsertTestFile(fileData) {
    if (!this.initialized) await this.initialize();

    const {
      filename,
      filepath,
      testType,
      fileContent = "",
      metadata = {},
    } = fileData;

    const fileHash = this.generateHash(fileContent);
    const metadataJson = JSON.stringify(metadata);

    return new Promise((resolve, reject) => {
      // Check if file exists
      const checkSql =
        "SELECT id, file_hash FROM test_files WHERE filename = ?";
      this.db.get(checkSql, [filename], (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row) {
          // Update existing file if hash changed
          if (row.file_hash !== fileHash) {
            const updateSql = `
                            UPDATE test_files 
                            SET filepath = ?, test_type = ?, updated_at = CURRENT_TIMESTAMP, 
                                file_hash = ?, metadata = ?
                            WHERE id = ?
                        `;
            this.db.run(
              updateSql,
              [filepath, testType, fileHash, metadataJson, row.id],
              function (err) {
                if (err) reject(err);
                else resolve({ id: row.id, action: "updated" });
              }
            );
          } else {
            resolve({ id: row.id, action: "unchanged" });
          }
        } else {
          // Insert new file
          const insertSql = `
                        INSERT INTO test_files (filename, filepath, test_type, file_hash, metadata)
                        VALUES (?, ?, ?, ?, ?)
                    `;
          this.db.run(
            insertSql,
            [filename, filepath, testType, fileHash, metadataJson],
            function (err) {
              if (err) reject(err);
              else resolve({ id: this.lastID, action: "created" });
            }
          );
        }
      });
    });
  }

  /**
   * Insert or update test context
   */
  async upsertTestContext(contextData) {
    if (!this.initialized) await this.initialize();

    const {
      description,
      acceptanceCriteria = "",
      relevantFields = [],
    } = contextData;

    const contextHash = this.generateHash(description + acceptanceCriteria);
    const relevantFieldsJson = JSON.stringify(relevantFields);

    return new Promise((resolve, reject) => {
      // Check if context exists
      const checkSql = "SELECT id FROM test_contexts WHERE context_hash = ?";
      this.db.get(checkSql, [contextHash], (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row) {
          // Update existing context
          const updateSql = `
                        UPDATE test_contexts 
                        SET acceptance_criteria = ?, field_count = ?, relevant_fields = ?
                        WHERE id = ?
                    `;
          this.db.run(
            updateSql,
            [
              acceptanceCriteria,
              relevantFields.length,
              relevantFieldsJson,
              row.id,
            ],
            function (err) {
              if (err) reject(err);
              else resolve({ id: row.id, action: "updated" });
            }
          );
        } else {
          // Insert new context
          const insertSql = `
                        INSERT INTO test_contexts (description, acceptance_criteria, context_hash, field_count, relevant_fields)
                        VALUES (?, ?, ?, ?, ?)
                    `;
          this.db.run(
            insertSql,
            [
              description,
              acceptanceCriteria,
              contextHash,
              relevantFields.length,
              relevantFieldsJson,
            ],
            function (err) {
              if (err) reject(err);
              else resolve({ id: this.lastID, action: "created" });
            }
          );
        }
      });
    });
  }

  /**
   * Link test file with context
   */
  async linkTestContext(testFileId, testContextId, relevanceScore = 1.0) {
    if (!this.initialized) await this.initialize();

    return new Promise((resolve, reject) => {
      const sql = `
                INSERT OR REPLACE INTO test_context_relations (test_file_id, test_context_id, relevance_score)
                VALUES (?, ?, ?)
            `;
      this.db.run(
        sql,
        [testFileId, testContextId, relevanceScore],
        function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  }

  /**
   * Record test execution result
   */
  async recordExecution(executionData) {
    if (!this.initialized) await this.initialize();

    const {
      testFileId,
      status,
      durationMs = 0,
      errorMessage = null,
      testCount = 0,
      passedCount = 0,
      failedCount = 0,
    } = executionData;

    return new Promise((resolve, reject) => {
      const sql = `
                INSERT INTO test_executions (test_file_id, status, duration_ms, error_message, test_count, passed_count, failed_count)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
      this.db.run(
        sql,
        [
          testFileId,
          status,
          durationMs,
          errorMessage,
          testCount,
          passedCount,
          failedCount,
        ],
        function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  }

  /**
   * Get test files by criteria
   */
  async getTestFiles(criteria = {}) {
    if (!this.initialized) await this.initialize();

    const { status, testType, filename } = criteria;
    let sql = "SELECT * FROM test_files WHERE 1=1";
    const params = [];

    if (status) {
      sql += " AND status = ?";
      params.push(status);
    }
    if (testType) {
      sql += " AND test_type = ?";
      params.push(testType);
    }
    if (filename) {
      sql += " AND filename LIKE ?";
      params.push(`%${filename}%`);
    }

    sql += " ORDER BY updated_at DESC";

    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  /**
   * Get test contexts by criteria
   */
  async getTestContexts(criteria = {}) {
    if (!this.initialized) await this.initialize();

    const { description } = criteria;
    let sql = "SELECT * FROM test_contexts WHERE 1=1";
    const params = [];

    if (description) {
      sql += " AND description LIKE ?";
      params.push(`%${description}%`);
    }

    sql += " ORDER BY created_at DESC";

    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else
          resolve(
            rows.map((row) => ({
              ...row,
              relevant_fields: JSON.parse(row.relevant_fields || "[]"),
            }))
          );
      });
    });
  }

  /**
   * Get test file with its related contexts
   */
  async getTestFileWithContexts(filename) {
    if (!this.initialized) await this.initialize();

    return new Promise((resolve, reject) => {
      const sql = `
                SELECT 
                    tf.*,
                    tc.description,
                    tc.acceptance_criteria,
                    tc.relevant_fields,
                    tcr.relevance_score
                FROM test_files tf
                LEFT JOIN test_context_relations tcr ON tf.id = tcr.test_file_id
                LEFT JOIN test_contexts tc ON tcr.test_context_id = tc.id
                WHERE tf.filename = ?
                ORDER BY tcr.relevance_score DESC
            `;

      this.db.all(sql, [filename], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        if (rows.length === 0) {
          resolve(null);
          return;
        }

        // Group contexts for the file
        const fileData = {
          ...rows[0],
          metadata: JSON.parse(rows[0].metadata || "{}"),
          contexts: rows
            .filter((row) => row.description)
            .map((row) => ({
              description: row.description,
              acceptance_criteria: row.acceptance_criteria,
              relevant_fields: JSON.parse(row.relevant_fields || "[]"),
              relevance_score: row.relevance_score,
            })),
        };

        resolve(fileData);
      });
    });
  }

  /**
   * Get similar contexts based on description
   */
  async getSimilarContexts(description, limit = 5) {
    if (!this.initialized) await this.initialize();

    return new Promise((resolve, reject) => {
      const sql = `
                SELECT *, 
                       CASE 
                           WHEN description LIKE ? THEN 1.0
                           WHEN description LIKE ? THEN 0.8
                           WHEN description LIKE ? THEN 0.6
                           ELSE 0.3
                       END as similarity_score
                FROM test_contexts 
                WHERE description LIKE ? OR description LIKE ? OR description LIKE ?
                ORDER BY similarity_score DESC, created_at DESC
                LIMIT ?
            `;

      const exactMatch = `%${description}%`;
      const wordMatch = `%${description.split(" ").join("%")}%`;
      const partialMatch = `%${description.substring(
        0,
        description.length / 2
      )}%`;

      this.db.all(
        sql,
        [
          exactMatch,
          wordMatch,
          partialMatch,
          exactMatch,
          wordMatch,
          partialMatch,
          limit,
        ],
        (err, rows) => {
          if (err) reject(err);
          else
            resolve(
              rows.map((row) => ({
                ...row,
                relevant_fields: JSON.parse(row.relevant_fields || "[]"),
              }))
            );
        }
      );
    });
  }

  /**
   * Get test execution history
   */
  async getExecutionHistory(testFileId = null, limit = 20) {
    if (!this.initialized) await this.initialize();

    let sql = `
            SELECT te.*, tf.filename, tf.test_type
            FROM test_executions te
            JOIN test_files tf ON te.test_file_id = tf.id
        `;
    const params = [];

    if (testFileId) {
      sql += " WHERE te.test_file_id = ?";
      params.push(testFileId);
    }

    sql += " ORDER BY te.execution_time DESC LIMIT ?";
    params.push(limit);

    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  /**
   * Update form fields from detected fields
   */
  async updateFormFields(fields) {
    if (!this.initialized) await this.initialize();

    const promises = fields.map((field) => {
      return new Promise((resolve, reject) => {
        const sql = `
                    INSERT OR REPLACE INTO form_fields (field_name, field_type, field_id, is_required, validation_rules, last_seen_at)
                    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                `;
        this.db.run(
          sql,
          [
            field.name,
            field.type,
            field.id || null,
            field.required ? 1 : 0,
            JSON.stringify(field.validation || {}),
          ],
          function (err) {
            if (err) reject(err);
            else resolve({ id: this.lastID });
          }
        );
      });
    });

    return Promise.all(promises);
  }

  /**
   * Get database statistics
   */
  async getStats() {
    if (!this.initialized) await this.initialize();

    return new Promise((resolve, reject) => {
      const sql = `
                SELECT 
                    (SELECT COUNT(*) FROM test_files WHERE status = 'active') as active_tests,
                    (SELECT COUNT(*) FROM test_contexts) as total_contexts,
                    (SELECT COUNT(*) FROM test_executions) as total_executions,
                    (SELECT COUNT(*) FROM test_executions WHERE status = 'passed') as passed_executions,
                    (SELECT COUNT(*) FROM test_executions WHERE status = 'failed') as failed_executions,
                    (SELECT COUNT(*) FROM form_fields) as total_fields,
                    (SELECT AVG(duration_ms) FROM test_executions WHERE duration_ms > 0) as avg_duration_ms
            `;

      this.db.get(sql, [], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  /**
   * Delete test file record by ID
   */
  async deleteTestFile(testFileId) {
    if (!this.initialized) await this.initialize();

    return new Promise((resolve, reject) => {
      // First, delete related records
      const deleteLinksSQL =
        "DELETE FROM test_context_relations WHERE test_file_id = ?";
      this.db.run(deleteLinksSQL, [testFileId], (err) => {
        if (err) {
          reject(
            new Error(`Failed to delete test context relations: ${err.message}`)
          );
          return;
        }

        // Delete executions
        const deleteExecutionsSQL =
          "DELETE FROM test_executions WHERE test_file_id = ?";
        this.db.run(deleteExecutionsSQL, [testFileId], (err) => {
          if (err) {
            reject(
              new Error(`Failed to delete test executions: ${err.message}`)
            );
            return;
          }

          // Finally, delete the test file record
          const deleteFileSQL = "DELETE FROM test_files WHERE id = ?";
          this.db.run(deleteFileSQL, [testFileId], function (err) {
            if (err) {
              reject(new Error(`Failed to delete test file: ${err.message}`));
              return;
            }

            if (this.changes === 0) {
              reject(new Error(`Test file with ID ${testFileId} not found`));
              return;
            }

            resolve({
              id: testFileId,
              deleted: true,
              changes: this.changes,
            });
          });
        });
      });
    });
  }

  /**
   * Delete orphaned test files (files that don't exist on disk)
   */
  async cleanupOrphanedRecords() {
    if (!this.initialized) await this.initialize();

    const testFiles = await this.getTestFiles();
    const orphanedIds = [];

    for (const file of testFiles) {
      if (!fs.existsSync(file.filepath)) {
        orphanedIds.push(file.id);
      }
    }

    const results = [];
    for (const id of orphanedIds) {
      try {
        const result = await this.deleteTestFile(id);
        results.push(result);
      } catch (error) {
        results.push({
          id: id,
          deleted: false,
          error: error.message,
        });
      }
    }

    return {
      totalOrphaned: orphanedIds.length,
      deleted: results.filter((r) => r.deleted).length,
      failed: results.filter((r) => !r.deleted).length,
      results: results,
    };
  }

  /**
   * Get validated tests from database
   */
  async getValidatedTests() {
    await this.initialize();

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM validated_tests_summary 
        ORDER BY validated_at DESC
      `;

      this.db.all(sql, [], (err, rows) => {
        if (err) {
          reject(new Error(`Failed to get validated tests: ${err.message}`));
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  /**
   * Check if test is validated
   */
  async isTestValidated(filepath) {
    await this.initialize();

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT validation_status FROM test_validations 
        WHERE filepath = ? AND validation_status = 'validated'
      `;

      this.db.get(sql, [filepath], (err, row) => {
        if (err) {
          reject(
            new Error(`Failed to check validation status: ${err.message}`)
          );
        } else {
          resolve(!!row);
        }
      });
    });
  }

  /**
   * Upsert data with conflict resolution
   */
  async upsertData(table, data, conflictColumns = ["id"]) {
    await this.initialize();

    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map(() => "?").join(", ");

    const conflictClause =
      conflictColumns.length > 0
        ? `ON CONFLICT(${conflictColumns.join(", ")}) DO UPDATE SET ${columns
            .filter((col) => !conflictColumns.includes(col))
            .map((col) => `${col} = excluded.${col}`)
            .join(", ")}`
        : "";

    const sql = `
      INSERT INTO ${table} (${columns.join(", ")})
      VALUES (${placeholders})
      ${conflictClause}
    `;

    return new Promise((resolve, reject) => {
      this.db.run(sql, values, function (err) {
        if (err) {
          reject(new Error(`Failed to upsert data: ${err.message}`));
        } else {
          resolve({
            id: this.lastID,
            changes: this.changes,
          });
        }
      });
    });
  }

  /**
   * Run custom query with parameters
   */
  async runQuery(sql, params = []) {
    await this.initialize();

    return new Promise((resolve, reject) => {
      // Determine if it's a SELECT query or modification query
      const isSelect = sql.trim().toUpperCase().startsWith("SELECT");

      if (isSelect) {
        this.db.all(sql, params, (err, rows) => {
          if (err) {
            reject(new Error(`Query failed: ${err.message}`));
          } else {
            resolve(rows || []);
          }
        });
      } else {
        this.db.run(sql, params, function (err) {
          if (err) {
            reject(new Error(`Query failed: ${err.message}`));
          } else {
            resolve({
              lastID: this.lastID,
              changes: this.changes,
            });
          }
        });
      }
    });
  }
}

module.exports = DatabaseAgent;
