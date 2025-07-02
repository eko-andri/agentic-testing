# Agentic Testing - Documentation

# Agentic Testing - Documentation

## 📋 Complete Documentation

The framework now has comprehensive documentation for all aspects:

## 🎯 Main Documentation

| Document                                                 | Purpose                                            | Target Audience |
| -------------------------------------------------------- | -------------------------------------------------- | --------------- |
| **[📖 Setup Guide](SETUP.md)**                           | Installation, configuration, troubleshooting       | **All users**   |
| **[🏗️ Architecture Guide](ARCHITECTURE.md)**             | Technical details, provider system, best practices | **Developers**  |
| **[🎯 Interactive Docs](../server/dev-tools/README.js)** | Complete framework reference                       | **All users**   |

## 🚀 Quick Access

**Get Started:**

```bash
# Read setup guide
cat docs/SETUP.md

# Interactive documentation
node server/dev-tools/README.js

# Health check
node server/dev-tools/unified-test-runner.js --health-check --all-providers
```

**Main Tool:**

```bash
# Unified test runner (all operations)
node server/dev-tools/unified-test-runner.js --help
```

## 📚 Additional Resources

**Framework Summaries:**

```bash
# Architecture success summary
node server/dev-tools/unified-architecture-success.js

# Refactor summary
node server/dev-tools/refactor-summary.js

# Claude 4 optimization details
node server/dev-tools/claude4-optimization-summary.js
```

## 📁 Legacy Documentation

Old documentation (pre-refactor) is available in `docs/legacy/` for reference, but is no longer accurate for the current architecture.

## 🚀 Getting Started

1. **Health Check**: `node server/dev-tools/unified-test-runner.js --health-check --all-providers`
2. **E2E Test**: `node server/dev-tools/unified-test-runner.js --e2e --bedrock-claude4`
3. **Documentation**: `node server/dev-tools/README.js`

The new architecture is fully centralized, modular, and production-ready!
