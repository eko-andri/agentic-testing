# CI/CD Testing Strategy for Agentic Testing System

## 🎯 **Problem Statement**

Ketika developer membuat PR (Pull Request), apakah sistem harus:

1. **Test semua sales journey** (comprehensive tapi lambat)
2. **Test hanya form field yang disebutkan di PR description** (cepat tapi focused)

## 🚀 **Recommended Strategy: Smart Incremental Testing**

### **Tier 1: PR-Specific Testing** ⚡ (Default untuk semua PR)

```bash
# Ekstrak field types dari PR description/changed files
# Test hanya field yang relevan dengan perubahan

# Contoh: PR menambah phone validation
→ Hanya jalankan: phone-core.spec.js + related business tests

# Contoh: PR menambah email + address
→ Hanya jalankan: email-core.spec.js, address-core.spec.js + related business tests
```

**Implementasi:**

```javascript
// Parse PR untuk extract changed fields
const changedFields = extractFieldsFromPR(prDescription, changedFiles);

// Generate dan jalankan tests hanya untuk fields tersebut
const testPlan = generateIncrementalTestPlan(changedFiles);
```

### **Tier 2: Full Regression Testing** 🔄 (Trigger khusus)

```bash
# Jalankan semua tests untuk scenarios berikut:
- Release candidates
- Major version updates
- Infrastructure changes
- Manual trigger dengan label "full-test"
```

## 🔧 **Auto-Sync Implementation**

### **Pre-Test Sync** (Sebelum menjalankan tests)

```bash
# Setiap kali CI/CD trigger, jalankan sync otomatis
node unified-test-runner.js --sync

# Pastikan database dan filesystem konsisten
# Hapus orphaned records sebelum generate tests baru
```

### **Post-Deployment Sync** (Setelah deployment)

```bash
# Cleanup orphaned tests yang mungkin tertinggal
# Update metadata untuk tests yang berhasil deploy
```

## 🎭 **Real-World Workflow Example**

### **Scenario 1: Developer menambah Phone Validation**

```yaml
# .github/workflows/test.yml
name: Agentic Testing Pipeline

on:
  pull_request:
    branches: [main]

jobs:
  smart-testing:
    runs-on: ubuntu-latest
    steps:
      - name: Extract Changed Fields
        run: |
          # Parse PR description untuk field types
          CHANGED_FIELDS=$(node scripts/extract-fields-from-pr.js)
          echo "CHANGED_FIELDS=$CHANGED_FIELDS" >> $GITHUB_ENV

      - name: Sync Database-Filesystem
        run: node server/dev-tools/unified-test-runner.js --sync

      - name: Run Incremental Tests
        run: |
          if [[ "$CHANGED_FIELDS" == *"phone"* ]]; then
            echo "Testing phone-related functionality"
            # Generate dan run phone tests
            node server/testAnalysisAgent.js --fields="phone" --context="$PR_DESCRIPTION"
          fi

      - name: Run Generated Tests
        run: npx playwright test tests/core/phone-core.spec.js
```

### **Scenario 2: Release Candidate**

```yaml
full-testing:
  if: contains(github.event.pull_request.labels.*.name, 'release-candidate')
  runs-on: ubuntu-latest
  steps:
    - name: Full Sync
      run: node server/dev-tools/unified-test-runner.js --sync

    - name: Generate All Tests
      run: node server/dev-tools/unified-test-runner.js --all

    - name: Run Full Playwright Suite
      run: npx playwright test
```

## 🛡️ **Auto-Repair Mechanism**

### **Daily Maintenance** (Scheduled)

```bash
# Cron job untuk maintenance rutin
0 2 * * * cd /app && node server/dev-tools/unified-test-runner.js --sync
```

### **Pre-commit Hook** (Development)

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "🔄 Syncing database before commit..."
node server/dev-tools/unified-test-runner.js --sync

if [ $? -ne 0 ]; then
    echo "❌ Database sync failed. Please fix before committing."
    exit 1
fi
```

## 📊 **Benefits of This Approach**

### **Fast Feedback Loop** ⚡

- PR tests selesai dalam 2-5 menit (vs 15-30 menit full tests)
- Developer dapat iterate lebih cepat
- CI/CD pipeline tidak bottleneck

### **Cost Effective** 💰

- Reduce CI minutes consumption
- Reduce infrastructure cost
- Focus resources pada changes yang relevan

### **Reliable Sync** 🔄

- Auto-repair inconsistencies
- Prevent orphaned records
- Maintain system health

### **Scalable** 📈

- Bisa handle project besar dengan ratusan form fields
- Tidak akan slow down meski project bertumbuh
- Easy to add new field types

## 🎯 **Implementation Priority**

1. **Phase 1**: Implement sync mechanism (✅ DONE)
2. **Phase 2**: Create PR field extraction logic
3. **Phase 3**: Integrate dengan CI/CD pipeline
4. **Phase 4**: Add monitoring dan alerting
5. **Phase 5**: Optimize berdasarkan usage patterns

## 💡 **Pro Tips**

### **Field Change Detection**

```javascript
// Deteksi perubahan field dari git diff
const changedFiles = execSync("git diff --name-only HEAD~1").toString();
const formFiles = changedFiles
  .split("\n")
  .filter(
    (f) => f.includes("form") || f.includes("input") || f.includes("validation")
  );
```

### **Smart Test Selection**

```javascript
// Gunakan dependency graph untuk smart selection
const relatedTests = findRelatedTests(changedFields);
const criticalPath = identifyCriticalPath(changedFields);
```

### **Progressive Testing**

```javascript
// Start dengan core tests, expand ke business tests jika diperlukan
const testPlan = {
  phase1: generateCoreTests(changedFields),
  phase2: generateBusinessTests(changedFields),
  phase3: generateIntegrationTests(changedFields),
};
```

Bagaimana menurut Anda strategi ini? Apakah sesuai dengan kebutuhan project Anda? 🤔
