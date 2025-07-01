# Development Tools - How To Guide

Essential development and testing scripts for contributors and developers who want to debug, test, or extend functionality of the Agentic Testing project.

## 🎯 **Target Audience**

- **Contributors**: Who want to contribute code to the project
- **Developers**: Who want to understand internal workings
- **Debuggers**: Who troubleshoot issues or analyze behavior
- **Testers**: Who validate functionality and performance

## 🧪 **Available Scripts**

### **📊 test-analysis-method-toggle.js** ⭐ PRIMARY

**Purpose**: Test analysis method toggle functionality  
**Usage**:

```bash
node test-analysis-method-toggle.js
```

**What it does**:

- Tests UI toggle between Live UI and File-based analysis
- Validates method selection persistence
- Checks proper API payload formation

**When to use**:

- After UI changes to toggle functionality
- Validating analysis method selection logic
- Debugging toggle state management

---

### **🌐 test-live-ui-demo.js** ⭐ PRIMARY

**Purpose**: Complete live UI analysis demonstration  
**Usage**:

```bash
node test-live-ui-demo.js
# or via npm script
npm run demo
```

**What it does**:

- Launches Puppeteer browser
- Analyzes live form on policy-form.html
- Demonstrates DOM extraction
- Shows form context generation

**When to use**:

- Testing live UI analysis pipeline
- Debugging Puppeteer integration
- Validating form extraction logic
- Demo purposes for stakeholders

---

### **⚖️ test-orchestrator-integration.js** ⭐ PRIMARY

**Purpose**: Compare Live UI vs File-based analysis methods  
**Usage**:

```bash
node test-orchestrator-integration.js
```

**What it does**:

- Runs same form through both analysis methods
- Compares results side-by-side
- Shows performance differences
- Validates consistency between methods

**When to use**:

- Benchmarking analysis methods
- Ensuring feature parity
- Performance comparison
- Integration testing

---

### **🤖 test-live-agent-integration.js** ⭐ ADVANCED

**Purpose**: Event-driven agent orchestration demo  
**Usage**:

```bash
node test-live-agent-integration.js
```

**What it does**:

- Demonstrates "army of agents" concept
- Shows event-driven architecture
- Tests agent coordination
- Proof-of-concept for advanced features

**When to use**:

- Testing event-driven architecture
- Validating agent coordination
- Advanced feature development
- Research and development

---

### **🔬 test-generator-consistency.js**

**Purpose**: Test consistency of code generation  
**Usage**:

```bash
node test-generator-consistency.js
```

**What it does**:

- Runs same input through generator multiple times
- Checks for consistent output patterns
- Validates modern Playwright syntax
- Tests prompt optimization

**When to use**:

- After prompt changes
- Validating code generation quality
- Testing consistency improvements
- Quality assurance

---

### **⚡ test-improved-generator.js**

**Purpose**: Test improved test generation with modern patterns  
**Usage**:

```bash
node test-improved-generator.js
```

**What it does**:

- Tests modern Playwright code generation
- Validates proper syntax patterns
- Checks error-free output
- Tests prompt improvements

**When to use**:

- After prompt updates
- Validating modern code patterns
- Testing generation improvements
- Code quality validation

## 🚀 Quick Commands

```bash
# Core functionality tests
node test-analysis-method-toggle.js    # Test new toggle feature
node test-live-ui-demo.js              # Main live UI demo
node test-orchestrator-integration.js  # Compare analysis methods
node test-live-agent-integration.js    # Event-driven agents demo

# NPM scripts (if available)
npm run demo                           # Live UI analysis demo
npm run integration-demo               # Integration example
npm run analyze                        # Quick analysis test
```

## 📋 File Summary

**Total Files**: 4 core test files + 1 README  
**Purpose**: Focused testing suite for key functionality  
**Coverage**: Analysis methods, live UI, orchestrator integration, event-driven agents
npm run analyze # Quick Puppeteer test

# Manual testing

node test-basic-functionality.js # Test core functionality
node test-generic-llm.js # Test LLM providers
node test-qwen-integration.js # Test Qwen integration

````

## 📝 Notes

- All experimental and debug files have been removed
- Only production-ready scripts are maintained
- Each script is self-contained and documented
- Use `npm run` commands for main demonstrations

## 🔧 Prerequisites

- Live Server running on port 5500 (for live UI demos)
- Ollama running with qwen2.5-coder:7b (for LLM tests)
- All dependencies installed (`npm install`)

---

## 🛠️ **Development Workflow**

### **Setting Up for Development**
```bash
# 1. Setup project
cd agentic-testing/server
npm install

# 2. Start development server (separate terminal)
npm run dev

# 3. Run development scripts
cd dev-tools
node test-live-ui-demo.js
````

### **Testing New Features**

```bash
# Test analysis methods
node test-analysis-method-toggle.js

# Test live UI pipeline
node test-live-ui-demo.js

# Compare both methods
node test-orchestrator-integration.js

# Test advanced features
node test-live-agent-integration.js
```

### **Debugging Common Issues**

#### **"Cannot connect to application"**

```bash
# Make sure policy-form.html is served
# Option 1: VS Code Live Server extension
# Option 2: Simple HTTP server
python -m http.server 8000

# Then update URLs in test scripts
```

#### **"LLM connection failed"**

```bash
# Check Ollama status
ollama ps

# Start Ollama if needed
ollama serve

# Test connection
curl http://localhost:11434/api/tags
```

#### **"Puppeteer browser launch failed"**

```bash
# Install dependencies (Linux)
sudo apt-get install -y chromium-browser

# Or install via Puppeteer
npx puppeteer browsers install chrome
```

## 📊 **Script Output Analysis**

### **Understanding Test Results**

#### **test-live-ui-demo.js Output**

```
✅ Browser launched successfully
✅ Page loaded: http://localhost:8000/policy-form.html
✅ Form analysis completed
ℹ️  Forms found: 1
ℹ️  Fields extracted: 4 (email, password, dob, terms)
ℹ️  Validation rules: 3
✅ Form context generated
```

#### **test-orchestrator-integration.js Output**

```
📊 COMPARISON RESULTS:
Method: live-ui     | Time: 2.1s | Forms: 1 | Fields: 4
Method: file-based  | Time: 3.2s | Forms: 1 | Fields: 4
✅ Both methods consistent results
```

### **Performance Benchmarks**

- **Live UI Analysis**: 1-3 seconds (no LLM needed)
- **File-based Analysis**: 2-5 seconds (LLM processing)
- **Test Generation**: 3-8 seconds (depends on complexity)

## 🔍 **Advanced Debugging**

### **Enable Debug Logging**

```bash
# Set debug mode
DEBUG=1 node test-live-ui-demo.js

# Or export for session
export DEBUG=1
node test-live-ui-demo.js
```

### **Browser Debug Mode**

```javascript
// Edit test script to show browser
const browser = await puppeteer.launch({
  headless: false, // Show browser
  devtools: true, // Open DevTools
  slowMo: 100, // Slow down actions
});
```

### **Check Generated Files**

```bash
# Analysis reports
ls -la ../reports/

# Screenshots
ls -la ../screenshots/

# Generated tests
ls -la ../tests/
```

## 📈 **Performance Monitoring**

### **Memory Usage**

```bash
# Monitor during execution
node --max-old-space-size=4096 test-live-ui-demo.js
```

### **Timing Analysis**

```javascript
// Add to any test script
console.time("analysis");
await analyzer.analyzeForm(url);
console.timeEnd("analysis");
```

## 🎯 **Best Practices for Contributors**

### **Before Making Changes**

1. Run all primary scripts to establish baseline
2. Document current behavior
3. Make incremental changes
4. Test after each change

### **Testing Your Changes**

```bash
# Run primary test suite
node test-analysis-method-toggle.js
node test-live-ui-demo.js
node test-orchestrator-integration.js

# Check for regressions
node test-generator-consistency.js
```

### **Adding New Scripts**

1. Follow naming convention: `test-[feature]-[purpose].js`
2. Add clear description and usage in this HOW_TO.md
3. Include error handling and cleanup
4. Document expected output format

## 📝 **Script Template**

```javascript
#!/usr/bin/env node

/**
 * test-new-feature.js
 * Purpose: Description of what this script tests
 * Usage: node test-new-feature.js
 */

const path = require("path");

async function testNewFeature() {
  console.log("🧪 Testing new feature...");

  try {
    // Your test logic here

    console.log("✅ Test completed successfully");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  testNewFeature();
}

module.exports = { testNewFeature };
```

---

**Need help with specific debugging scenarios? Check the main [Setup Guide](../../docs/SETUP.md) or [Architecture Guide](../../docs/ARCHITECTURE.md) for more details.**
