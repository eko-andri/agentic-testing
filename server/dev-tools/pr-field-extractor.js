#!/usr/bin/env node

/**
 * PR Field Extractor
 * Extract form fields yang berubah dari PR description dan changed files
 * untuk Smart Incremental Testing
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

class PRFieldExtractor {
  constructor() {
    this.fieldPatterns = {
      phone: /(?:phone|mobile|telephone|tel|contact)/i,
      email: /(?:email|e-mail|mail)/i,
      date: /(?:date|birth|dob|birthday|born)/i,
      address: /(?:address|street|city|postal|zip|country)/i,
      name: /(?:name|first|last|given|surname|full)/i,
      password: /(?:password|pass|secret|auth)/i,
      number: /(?:number|num|count|quantity|amount)/i,
      text: /(?:text|comment|description|note|message)/i,
    };

    this.extractedFields = new Set();
    this.sources = {
      prDescription: [],
      changedFiles: [],
      gitDiff: [],
    };
  }

  /**
   * Extract fields dari PR description
   */
  extractFromPRDescription(prDescription) {
    console.log("🔍 Extracting fields from PR description...");

    if (!prDescription) {
      console.log("   No PR description provided");
      return [];
    }

    const foundFields = [];

    Object.entries(this.fieldPatterns).forEach(([fieldType, pattern]) => {
      if (pattern.test(prDescription)) {
        foundFields.push(fieldType);
        this.extractedFields.add(fieldType);
        this.sources.prDescription.push(fieldType);
      }
    });

    console.log(`   Found fields: ${foundFields.join(", ") || "none"}`);
    return foundFields;
  }

  /**
   * Extract fields dari changed files
   */
  extractFromChangedFiles(changedFiles = null) {
    console.log("🔍 Extracting fields from changed files...");

    try {
      // Get changed files from git if not provided
      if (!changedFiles) {
        changedFiles = execSync(
          'git diff --name-only HEAD~1 2>/dev/null || echo ""'
        )
          .toString()
          .trim()
          .split("\n")
          .filter((f) => f.length > 0);
      }

      console.log(`   Changed files: ${changedFiles.length}`);

      const foundFields = [];

      changedFiles.forEach((file) => {
        const filename = path.basename(file).toLowerCase();
        const dirname = path.dirname(file).toLowerCase();
        const fullPath = (dirname + "/" + filename).toLowerCase();

        Object.entries(this.fieldPatterns).forEach(([fieldType, pattern]) => {
          if (pattern.test(fullPath)) {
            if (!foundFields.includes(fieldType)) {
              foundFields.push(fieldType);
              this.extractedFields.add(fieldType);
              this.sources.changedFiles.push({
                field: fieldType,
                file: file,
              });
            }
          }
        });
      });

      console.log(`   Found fields: ${foundFields.join(", ") || "none"}`);
      return foundFields;
    } catch (error) {
      console.log(`   Error getting changed files: ${error.message}`);
      return [];
    }
  }

  /**
   * Extract fields dari git diff content
   */
  extractFromGitDiff() {
    console.log("🔍 Extracting fields from git diff content...");

    try {
      // Get git diff content
      const diffContent = execSync('git diff HEAD~1 2>/dev/null || echo ""')
        .toString()
        .toLowerCase();

      if (!diffContent.trim()) {
        console.log("   No git diff content available");
        return [];
      }

      const foundFields = [];

      Object.entries(this.fieldPatterns).forEach(([fieldType, pattern]) => {
        if (pattern.test(diffContent)) {
          if (!foundFields.includes(fieldType)) {
            foundFields.push(fieldType);
            this.extractedFields.add(fieldType);
            this.sources.gitDiff.push(fieldType);
          }
        }
      });

      console.log(`   Found fields: ${foundFields.join(", ") || "none"}`);
      return foundFields;
    } catch (error) {
      console.log(`   Error getting git diff: ${error.message}`);
      return [];
    }
  }

  /**
   * Extract all fields dari semua sources
   */
  extractAllFields(prDescription = null, changedFiles = null) {
    console.log("🎯 PR Field Extraction Started");
    console.log("=".repeat(40));

    // Extract dari berbagai sources
    this.extractFromPRDescription(prDescription);
    this.extractFromChangedFiles(changedFiles);
    this.extractFromGitDiff();

    const allFields = Array.from(this.extractedFields);

    console.log("\n📊 Extraction Summary:");
    console.log(`   Total unique fields: ${allFields.length}`);
    console.log(`   Fields: ${allFields.join(", ") || "none"}`);

    return {
      fields: allFields,
      sources: this.sources,
      summary: {
        totalFields: allFields.length,
        fromPR: this.sources.prDescription.length,
        fromFiles: this.sources.changedFiles.length,
        fromDiff: this.sources.gitDiff.length,
      },
    };
  }

  /**
   * Generate test command berdasarkan extracted fields
   */
  generateTestCommands(fields) {
    console.log("\n🚀 Generating test commands...");

    if (fields.length === 0) {
      console.log("   No fields detected - running default tests");
      return ["node server/dev-tools/unified-test-runner.js --e2e"];
    }

    const commands = [];

    // Sync database first
    commands.push("node server/dev-tools/unified-test-runner.js --sync");

    // Generate tests for each field type
    fields.forEach((field) => {
      commands.push(`echo "Generating tests for ${field} field..."`);

      // Core test command
      const coreTestPattern = `server/tests/core/${field}-core.spec.js`;
      commands.push(
        `if [ -f "${coreTestPattern}" ]; then npx playwright test ${coreTestPattern}; fi`
      );

      // Business test pattern (bisa multiple files)
      commands.push(
        `find server/tests/business -name "*${field}*" -name "*.spec.js" | head -5 | xargs -I {} npx playwright test {}`
      );
    });

    // Summary command
    commands.push('echo "✅ Incremental testing completed"');

    console.log(`   Generated ${commands.length} commands`);
    commands.forEach((cmd, i) => {
      console.log(`   ${i + 1}. ${cmd}`);
    });

    return commands;
  }

  /**
   * Export sebagai GitHub Actions environment variables
   */
  exportForGitHubActions(result) {
    if (process.env.GITHUB_ACTIONS) {
      const fieldsStr = result.fields.join(",");
      const commandsStr = this.generateTestCommands(result.fields).join(" && ");

      console.log("\n📤 Exporting to GitHub Actions...");
      console.log(`::set-output name=changed-fields::${fieldsStr}`);
      console.log(`::set-output name=test-commands::${commandsStr}`);
      console.log(`::set-output name=field-count::${result.fields.length}`);
    }
  }

  /**
   * Generate report
   */
  generateReport(result) {
    const report = {
      timestamp: new Date().toISOString(),
      extraction: result,
      testCommands: this.generateTestCommands(result.fields),
      recommendations: this.generateRecommendations(result),
    };

    // Save report
    const reportPath = path.join(
      __dirname,
      "../test-results/pr-field-extraction.json"
    );
    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n💾 Report saved: ${reportPath}`);
    } catch (error) {
      console.log(`\n❌ Failed to save report: ${error.message}`);
    }

    return report;
  }

  /**
   * Generate testing recommendations
   */
  generateRecommendations(result) {
    const recommendations = [];

    if (result.fields.length === 0) {
      recommendations.push({
        type: "warning",
        message:
          "No form fields detected. Consider running full regression tests.",
        action: "Add field keywords to PR description or check file changes.",
      });
    } else if (result.fields.length > 5) {
      recommendations.push({
        type: "info",
        message: "Many fields detected. Consider splitting into smaller PRs.",
        action: "Run tests in parallel or use test sharding.",
      });
    } else {
      recommendations.push({
        type: "success",
        message: `Optimal field count detected (${result.fields.length}). Incremental testing recommended.`,
        action: "Run focused tests for detected fields.",
      });
    }

    // Field-specific recommendations
    if (result.fields.includes("password")) {
      recommendations.push({
        type: "security",
        message: "Password field detected. Extra security testing recommended.",
        action: "Run password validation and security tests.",
      });
    }

    if (result.fields.includes("email")) {
      recommendations.push({
        type: "validation",
        message:
          "Email field detected. Email format validation tests recommended.",
        action: "Test various email formats and edge cases.",
      });
    }

    return recommendations;
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes("--help")) {
    console.log("🎯 PR Field Extractor - Help");
    console.log("Usage: node pr-field-extractor.js [options]");
    console.log("");
    console.log("Options:");
    console.log('  --pr-desc "text"    PR description to analyze');
    console.log('  --files "f1,f2"     Comma-separated list of changed files');
    console.log("  --github-actions    Export for GitHub Actions");
    console.log("  --help              Show this help");
    console.log("");
    console.log("Examples:");
    console.log("  node pr-field-extractor.js");
    console.log(
      '  node pr-field-extractor.js --pr-desc "Added phone validation"'
    );
    console.log('  node pr-field-extractor.js --files "form.js,validation.js"');
    console.log("  node pr-field-extractor.js --github-actions");
    return;
  }

  const prDescIndex = args.indexOf("--pr-desc");
  const filesIndex = args.indexOf("--files");

  const prDescription =
    prDescIndex !== -1 ? args[prDescIndex + 1] : process.env.PR_DESCRIPTION;
  const changedFiles =
    filesIndex !== -1
      ? args[filesIndex + 1].split(",").map((f) => f.trim())
      : null;

  const extractor = new PRFieldExtractor();
  const result = extractor.extractAllFields(prDescription, changedFiles);

  if (args.includes("--github-actions")) {
    extractor.exportForGitHubActions(result);
  }

  const report = extractor.generateReport(result);

  console.log("\n🎉 PR Field Extraction Complete!");
  console.log(`   Detected Fields: ${result.fields.join(", ") || "none"}`);
  console.log(`   Test Commands: ${report.testCommands.length}`);
  console.log(`   Recommendations: ${report.recommendations.length}`);
}

module.exports = PRFieldExtractor;
