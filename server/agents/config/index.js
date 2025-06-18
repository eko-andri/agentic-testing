// Agent Configuration Index - Central import point for all agent configs
const FORM_STRUCTURE_ANALYZER = require("./agents/form-structure-analyzer");
const FORM_QUALITY_AUDITOR = require("./agents/form-quality-auditor");
const INTELLIGENT_TEST_GENERATOR = require("./agents/intelligent-test-generator");
const TEST_CODE_GENERATOR = require("./agents/test-code-generator");
const TEST_QUALITY_ANALYZER = require("./agents/test-quality-analyzer");
const TEST_QUALITY_IMPROVER = require("./agents/test-quality-improver");
const TEST_CODE_REVIEWER = require("./agents/test-code-verifier");
const { FRAMEWORK_TEMPLATES } = require("./framework-templates");

// Consolidated AGENTS_CONFIG array
const AGENTS_CONFIG = [
  FORM_STRUCTURE_ANALYZER,
  FORM_QUALITY_AUDITOR,
  INTELLIGENT_TEST_GENERATOR,
  TEST_CODE_GENERATOR,
  TEST_CODE_REVIEWER,
  TEST_QUALITY_ANALYZER,
  TEST_QUALITY_IMPROVER,
];

module.exports = {
  AGENTS_CONFIG,
  FRAMEWORK_TEMPLATES,
  //   FORM_STRUCTURE_ANALYZER,
  //   FORM_QUALITY_AUDITOR,
  //   INTELLIGENT_TEST_GENERATOR,
  //   TEST_CODE_GENERATOR,
  //   TEST_QUALITY_ANALYZER,
  //   TEST_QUALITY_IMPROVER,
};
