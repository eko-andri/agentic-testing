// Agent Configuration Index - Central import point for all agent configs
const FORM_STRUCTURE_ANALYZER = require("./agents/form-structure-analyzer");
const INTELLIGENT_TEST_GENERATOR = require("./agents/intelligent-test-generator");
const TEST_QUALITY_AUDITOR = require("./agents/test-quality-auditor");
const TEST_CODE_GENERATOR = require("./agents/test-code-generator");
const { FRAMEWORK_TEMPLATES } = require("./framework-templates");

// Consolidated AGENTS_CONFIG array
const AGENTS_CONFIG = [
  FORM_STRUCTURE_ANALYZER,
  INTELLIGENT_TEST_GENERATOR,
  TEST_QUALITY_AUDITOR,
  TEST_CODE_GENERATOR,
];

module.exports = {
  AGENTS_CONFIG,
  FRAMEWORK_TEMPLATES,
  // Individual agent exports for specific use
  FORM_STRUCTURE_ANALYZER,
  INTELLIGENT_TEST_GENERATOR,
  TEST_QUALITY_AUDITOR,
  TEST_CODE_GENERATOR,
};
