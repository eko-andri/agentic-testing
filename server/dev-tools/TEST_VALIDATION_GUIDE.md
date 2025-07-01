# Test Validation & Recovery System Guide

## 🎯 Overview

Sistem Test Validation & Recovery memungkinkan developer untuk:

1. **Mark test sebagai "validated"** - test yang sudah benar dan tidak boleh dihapus
2. **Backup otomatis** - isi file test disimpan di database dan physical backup
3. **Smart cleanup** - hanya hapus test yang belum validated (draft tests)
4. **Recovery system** - restore test validated yang terhapus dari backup

## 🔧 Workflow untuk Developer

### 1. Full Regression Testing (Local Development)

```bash
# Step 1: Lihat test apa saja yang sudah validated (tidak boleh dihapus)
node unified-test-runner.js --list-validated

# Step 2: Smart cleanup - hapus semua draft tests, pertahankan validated tests
node unified-test-runner.js --cleanup

# Step 3: Generate test baru dari UI Analyzer atau manual
node unified-test-runner.js --test-core-gen

# Step 4: Run full test suite
npm test
# atau
npx playwright test
```

### 2. Partial Testing & Validation Workflow

```bash
# Step 1: Update existing tests (add/modify functionality)
# Edit file manually atau via agent...

# Step 2: Run specific tests
npx playwright test server/tests/core/phone-core.spec.js

# Step 3: Validate test setelah yakin sudah benar
node unified-test-runner.js --validate --file phone-core.spec.js --desc "Phone validation working correctly" --by "developer-name"

# Step 4: Test akan di-backup dan di-mark sebagai validated (protected from deletion)
```

### 3. Batch Validation (Multiple Tests)

```bash
# Validate semua core tests sekaligus
node unified-test-runner.js --batch-validate --pattern "core" --desc "Core tests validated after regression" --by "developer-name"

# Validate specific pattern
node unified-test-runner.js --batch-validate --pattern "phone" --desc "Phone related tests validated"
```

### 4. Recovery System

```bash
# Jika test validated terhapus secara tidak sengaja
node unified-test-runner.js --recover --file phone-core.spec.js

# Test akan di-restore dari database backup
```

## 📋 Command Reference

### Validation Commands

| Command            | Description                        | Example                                                           |
| ------------------ | ---------------------------------- | ----------------------------------------------------------------- |
| `--validate`       | Validate single test file          | `--validate --file phone-core.spec.js --desc "Working correctly"` |
| `--batch-validate` | Validate multiple tests            | `--batch-validate --pattern "core" --desc "Batch validated"`      |
| `--list-validated` | List all validated tests           | `--list-validated`                                                |
| `--recover`        | Recover deleted validated test     | `--recover --file phone-core.spec.js`                             |
| `--cleanup`        | Smart cleanup (preserve validated) | `--cleanup`                                                       |

### Parameters

| Parameter   | Description                       | Required                           |
| ----------- | --------------------------------- | ---------------------------------- |
| `--file`    | Test file name                    | Yes (for validate/recover)         |
| `--pattern` | File pattern for batch operations | Yes (for batch-validate)           |
| `--desc`    | Description/notes for validation  | Optional                           |
| `--by`      | Who is validating                 | Optional (defaults to 'developer') |

## 🔒 Validation States

### 1. Draft Tests (Non-Validated)

- **Status**: Can be deleted during cleanup
- **Backup**: Physical backup created before deletion
- **Protection**: None

### 2. Validated Tests

- **Status**: Protected from deletion
- **Backup**: Full content backup in database + physical backup
- **Protection**: Cannot be deleted by smart cleanup
- **Recovery**: Can be restored if accidentally deleted

## 🛡️ Protection Mechanism

### How Validation Works

1. **Metadata Flag**: Test file gets validation header comment
2. **Database Backup**: Full file content stored in database
3. **Physical Backup**: Timestamped backup file created
4. **Cache Update**: Validation status cached for fast lookup

### What's Protected

```javascript
/**
 * 🛡️  VALIDATED TEST - DO NOT DELETE
 * Validated: 2025-07-01T07:11:58.247Z
 * Description: Phone validation test working correctly
 * Status: PROTECTED
 */
```

## 📊 Smart Cleanup Rules

### Files That Will Be Deleted

- Tests without validation flag
- Files not in validation database
- Draft/temporary test files

### Files That Will Be Preserved

- All validated tests (with 🛡️ flag)
- Tests with database backup
- Recently modified files (optional protection)

## 🔄 Recovery Process

### When Test Gets Deleted

1. **Detection**: System checks if file exists vs database
2. **Backup Lookup**: Finds latest validated backup
3. **Restoration**: Recreates file from database content
4. **Verification**: Updates cache and confirms recovery

### Recovery Sources

1. **Primary**: Database backup (latest validated content)
2. **Secondary**: Physical backup files (timestamped)
3. **Fallback**: Version control (if available)

## 🎯 Best Practices

### For Developers

1. **Always validate tests** that work correctly
2. **Add meaningful descriptions** when validating
3. **Use smart cleanup** before major test generation
4. **Check validated list** before manual cleanup
5. **Recovery immediately** if validated test is missing

### For Teams

1. **Consistent validation** across team members
2. **Clear descriptions** for validation reasons
3. **Regular backup verification**
4. **Document validation workflow** in team standards

## 🚨 Emergency Procedures

### If All Tests Are Lost

```bash
# 1. Check database for backups
node unified-test-runner.js --list-validated

# 2. Recover all validated tests
for test in $(node unified-test-runner.js --list-validated | grep "File:" | awk '{print $2}'); do
    node unified-test-runner.js --recover --file "$test"
done

# 3. Verify recovery
ls -la server/tests/core/
ls -la server/tests/business/
```

### If Database Is Corrupted

```bash
# 1. Check physical backups
ls -la server/test-backups/

# 2. Manual recovery from backups
# Restore files manually from timestamped backups

# 3. Re-validate recovered tests
node unified-test-runner.js --batch-validate --pattern "*" --desc "Re-validated after recovery"
```

## 📈 Monitoring & Maintenance

### Regular Checks

```bash
# Weekly: Verify all validated tests exist
node unified-test-runner.js --list-validated

# Monthly: Clean up old physical backups (optional)
find server/test-backups/ -name "*.backup" -mtime +30 -delete

# Before major releases: Full validation audit
node unified-test-runner.js --batch-validate --pattern "*" --desc "Pre-release validation"
```

### Health Monitoring

```bash
# Check database integrity
node dev-tools/test-validation-manager.js --help

# Verify backup consistency
# Compare file content with database backup

# Monitor validation trends
# Track validation frequency and patterns
```

## 🎉 Success Indicators

### System Working Correctly When:

- ✅ Validated tests survive cleanup operations
- ✅ Recovery restores exact file content
- ✅ Database and file system stay in sync
- ✅ Physical backups are created consistently
- ✅ No validated tests are accidentally lost

### Warning Signs:

- ❌ Validated tests getting deleted
- ❌ Recovery fails to restore files
- ❌ Database queries return empty results
- ❌ Physical backup creation fails
- ❌ Cache inconsistencies

## 🔗 Integration with CI/CD

### Pre-commit Hooks

```bash
# Validate all modified test files
git diff --name-only --cached | grep "\.spec\.js$" | while read file; do
    if [ -f "$file" ]; then
        node unified-test-runner.js --validate --file "$(basename "$file")" --desc "Pre-commit validation"
    fi
done
```

### Build Pipeline

```bash
# 1. Verify validated tests exist
node unified-test-runner.js --list-validated

# 2. Smart cleanup before test generation
node unified-test-runner.js --cleanup

# 3. Generate new tests
node unified-test-runner.js --test-core-gen

# 4. Run full test suite
npm test

# 5. Validate new tests that pass
# (manual or automated based on success criteria)
```

---

## 💡 Tips & Tricks

1. **Use descriptive validation messages** - helps with debugging later
2. **Validate tests immediately** after they pass - don't wait
3. **Regular cleanup** prevents test file bloat
4. **Backup verification** should be part of routine maintenance
5. **Team coordination** on validation standards improves consistency

This system ensures your validated tests are never lost and provides complete workflow flexibility for both focused and comprehensive testing approaches! 🚀
