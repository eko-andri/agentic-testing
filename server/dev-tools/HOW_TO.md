# Development Tools - How To Guide

Essential development and testing scripts untuk Agentic Testing System yang telah dikonsolidasi dan disederhanakan.

## 🎯 **Target Audience**

- **Contributors**: Yang ingin berkontribusi pada project
- **Developers**: Yang ingin memahami internal workings
- **Debuggers**: Yang troubleshoot issues atau analyze behavior
- **Testers**: Yang validate functionality dan performance

## 🧪 **Unified Testing Tools**

### **🎯 unified-test-runner.js** ⭐ PRIMARY TESTING TOOL

**Purpose**: All-in-one testing tool yang menggabungkan semua functionality testing  
**Usage**:

```bash
# Show help
node unified-test-runner.js --help

# Test Database Agent
node unified-test-runner.js --database

# Test Analysis Agent
node unified-test-runner.js --analysis

# Test End-to-End Pipeline
node unified-test-runner.js --e2e

# Debug core test generation issues
node unified-test-runner.js --debug-core

# Test core test generation functionality
node unified-test-runner.js --test-core-gen

# Sync database with file system
node unified-test-runner.js --sync

# Analyze BA testing strategy
node unified-test-runner.js --ba-strategy

# Smart cleanup (preserve validated tests)
node unified-test-runner.js --cleanup

# List all validated tests
node unified-test-runner.js --list-validated

# Validate a test file (mark as protected)
node unified-test-runner.js --validate --file phone-core.spec.js --desc "Working correctly"

# Recover deleted validated test
node unified-test-runner.js --recover --file phone-core.spec.js

# Batch validate multiple tests
node unified-test-runner.js --batch-validate --pattern "core" --desc "Batch validated"

# Run all tests
node unified-test-runner.js --all
```

**What it does**:

- **Database Testing**: CRUD operations, statistics, similarity analysis
- **Analysis Agent Testing**: Context analysis, test plan generation
- **E2E Pipeline Testing**: Complete workflow dari analysis hingga test generation
- **Core Debug**: Debug core test generation issues, check DB vs filesystem consistency
- **Core Test Generation**: Verify core test generation functionality dengan sample fields
- **Sync Management**: Synchronize database dengan file system state
- **BA Strategy Analysis**: Analyze testing strategy untuk berbagai tipe Business Analyst
- **Smart Cleanup**: Delete draft tests but preserve validated tests
- **Test Validation**: Mark tests as validated (protected from deletion)
- **Test Recovery**: Restore validated tests from backup if deleted
- **Batch Operations**: Validate multiple tests sekaligus
- **Comprehensive Reporting**: JSON reports dan detailed summaries

**When to use**:

- Setelah code changes untuk validate functionality
- Before deployment untuk comprehensive testing
- Debugging specific components (database, analysis, pipeline)
- When core tests tidak ter-generate (gunakan --debug-core)
- Testing core test generation logic (gunakan --test-core-gen)
- Performance dan reliability testing

---

### **🛠️ dev-utils.js** ⭐ DEVELOPMENT UTILITIES

**Purpose**: Helper utilities untuk development dan debugging  
**Usage**:

```javascript
const DevTestUtils = require("./dev-utils");

// Quick health check
await DevTestUtils.quickHealthCheck();

// Test context analysis
await DevTestUtils.quickContextTest("Email validation test");

// Cleanup old test files
await DevTestUtils.cleanupOldTests(7); // older than 7 days

// Reset database
await DevTestUtils.resetDatabase();

// Generate sample data
await DevTestUtils.generateSampleData();
```

**What it provides**:

- **Health Checks**: Quick system validation
- **Context Testing**: Rapid context analysis testing
- **File Management**: Cleanup utilities untuk test files
- **Database Management**: Reset dan sample data generation
- **Development Shortcuts**: Common development tasks

---

### **🌐 dev-environment.js** ⭐ ENVIRONMENT SETUP

**Purpose**: Development environment setup dan server management  
**Usage**:

```bash
# Setup database and start server
node dev-environment.js setup

# Start development server only
node dev-environment.js server

# Quick health check
node dev-environment.js health

# Show system status
node dev-environment.js status

# Show help
node dev-environment.js help
```

**What it does**:

- **Server Management**: Start/stop Python HTTP server untuk testing
- **Database Setup**: Initialize database schema
- **Health Monitoring**: System health checks
- **Status Reporting**: Comprehensive system status

## 🚀 **Quick Start Guide**

### 1. **Environment Setup**

```bash
# Setup environment
node dev-environment.js setup

# This will:
# - Initialize database
# - Start local server on port 5500
```

### 2. **Run Tests**

```bash
# Run all tests
node unified-test-runner.js --all

# Or run specific tests
node unified-test-runner.js --database
node unified-test-runner.js --analysis
node unified-test-runner.js --e2e
```

### 3. **Development Workflow**

```bash
# Start server untuk development
node dev-environment.js server

# Di terminal lain, run tests
node unified-test-runner.js --e2e

# Check system health
node dev-environment.js health
```

## 📊 **Testing Scenarios**

### **Database Agent Tests**

- Context CRUD operations
- Statistics dan analytics
- Similar context analysis
- Performance validation

### **Analysis Agent Tests**

- Context analysis functionality
- Test plan generation
- Field relevance analysis
- Smart recommendations

### **End-to-End Pipeline Tests**

- Email validation scenario
- Date validation scenario
- Complete workflow testing
- Integration validation

## 🔧 **Troubleshooting**

### Common Issues:

1. **Server tidak start**

   ```bash
   # Check if Python3 available
   python3 --version

   # Manual server start
   cd ../.. && python3 -m http.server 5500
   ```

2. **Database issues**

   ```bash
   # Reset database
   node -e "require('./dev-utils').resetDatabase()"
   ```

3. **LLM connection issues**
   ```bash
   # Check Ollama service
   curl http://localhost:11434/api/version
   ```

## 📈 **Performance Monitoring**

### Test Results Location:

- **Main Results**: `../test-results/unified-test-results.json`
- **E2E Results**: `../test-results/e2e-pipeline-test-results.json`
- **Generated Tests**: `../tests/business/` dan `../tests/core/`

### Key Metrics:

- **Success Rate**: Percentage of passed tests
- **Execution Time**: Performance benchmarks
- **Coverage**: Test coverage statistics
- **Database Stats**: Context dan execution metrics

---

## 🎉 **Best Practices**

1. **Always run health check** sebelum development
2. **Use unified-test-runner** untuk comprehensive testing
3. **Clean up old files** secara periodic dengan dev-utils
4. **Monitor system status** dengan dev-environment
5. **Check results** di test-results folder untuk analysis

---

## 📞 **Support**

Jika mengalami issues:

1. Run `node dev-environment.js health` untuk basic diagnosis
2. Check `../test-results/` untuk detailed error logs
3. Gunakan `DevTestUtils.resetDatabase()` jika database corruption
4. Restart server dengan `dev-environment.js server`

---

## 🛡️ **Test Validation & Recovery System**

### **Workflow untuk Developer Regression Testing**

```bash
# 1. Cek test apa saja yang sudah validated (tidak boleh dihapus)
node unified-test-runner.js --list-validated

# 2. Smart cleanup - hapus draft tests, pertahankan validated tests
node unified-test-runner.js --cleanup

# 3. Generate test baru
node unified-test-runner.js --test-core-gen

# 4. Run full test dan validate yang berhasil
npm test
node unified-test-runner.js --validate --file phone-core.spec.js --desc "Phone validation working"
```

### **Key Features**

- **🔒 Validation Flag**: Mark test sebagai "validated" dan protected dari deletion
- **💾 Automatic Backup**: Isi file disimpan di database dan physical backup
- **🧹 Smart Cleanup**: Hanya hapus draft tests, pertahankan validated tests
- **🔄 Recovery System**: Restore test yang terhapus dari backup database
- **📊 Batch Operations**: Validate banyak test sekaligus

### **Test States**

1. **Draft Tests**: Bisa dihapus saat cleanup, tidak di-protect
2. **Validated Tests**: Protected dari deletion, ada backup di database, bisa di-recover

See [TEST_VALIDATION_GUIDE.md](./TEST_VALIDATION_GUIDE.md) untuk detailed workflow.

---

_Last Updated: July 2025_  
_Version: 2.0 - Unified Testing Architecture_
