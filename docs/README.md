# Agentic Testing - Documentation

## 📋 Current Documentation

The architecture has been completely refactored to a unified system. All documentation is now centralized in the dev-tools directory.

## 🎯 Quick Access

**Main Documentation:**

```bash
# Complete framework documentation
node server/dev-tools/README.js

# Architecture success summary
node server/dev-tools/unified-architecture-success.js

# Refactor summary
node server/dev-tools/refactor-summary.js

# Claude 4 optimization details
node server/dev-tools/claude4-optimization-summary.js
```

**Main Tool:**

```bash
# Unified test runner (all testing operations)
node server/dev-tools/unified-test-runner.js --help
```

## 📁 Legacy Documentation

Old documentation (pre-refactor) is available in `docs/legacy/` for reference, but is no longer accurate for the current architecture.

## 🚀 Getting Started

1. **Health Check**: `node server/dev-tools/unified-test-runner.js --health-check --all-providers`
2. **E2E Test**: `node server/dev-tools/unified-test-runner.js --e2e --bedrock-claude4`
3. **Documentation**: `node server/dev-tools/README.js`

The new architecture is fully centralized, modular, and production-ready!
