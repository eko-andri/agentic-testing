/**
 * Dummy Database Agent - Placeholder for removed database functionality
 * This maintains compatibility while database is disabled
 */

class DatabaseAgent {
  constructor() {
    console.log("[DatabaseAgent] Initialized in disabled mode");
  }

  async initialize() {
    return true;
  }

  async getSimilarContexts() {
    return [];
  }

  async upsertTestContext() {
    return { id: "dummy-context" };
  }

  async getTestFiles() {
    return [];
  }

  async getTestFileWithContexts() {
    return null;
  }

  async upsertTestFile() {
    return { id: "dummy-file" };
  }

  async linkTestContext() {
    return true;
  }

  async getStats() {
    return { total: 0, recent: 0 };
  }

  async getExecutionHistory() {
    return [];
  }

  async close() {
    return true;
  }
}

module.exports = DatabaseAgent;
