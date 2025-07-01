#!/usr/bin/env node

/**
 * BA Testing Strategy Manager
 * Mengakomodasi berbagai pendekatan testing dari Business Analyst
 * - Focused Testing (sesuai deskripsi)
 * - Comprehensive Testing (full sales journey)
 */

const PRFieldExtractor = require("./pr-field-extractor");
const fs = require("fs");
const path = require("path");

class BATestingManager {
  constructor() {
    this.testingProfiles = {
      focused: {
        name: "Focused Testing",
        description: "Test hanya fitur/bug sesuai deskripsi",
        scope: "targeted",
        timeEstimate: "5-15 minutes",
        coverage: "specific feature",
        riskLevel: "medium",
      },
      comprehensive: {
        name: "Comprehensive Testing",
        description: "Test full sales journey (4-5 halaman)",
        scope: "end-to-end",
        timeEstimate: "30-60 minutes",
        coverage: "entire user flow",
        riskLevel: "low",
      },
      hybrid: {
        name: "Hybrid Testing",
        description: "Smart combination based on change impact",
        scope: "adaptive",
        timeEstimate: "15-30 minutes",
        coverage: "contextual",
        riskLevel: "low-medium",
      },
    };

    this.salesJourneyPages = [
      "landing-page",
      "product-selection",
      "customer-details",
      "payment-information",
      "confirmation",
      "thank-you",
    ];

    this.changeImpactRules = {
      low: ["text-changes", "styling", "minor-validation"],
      medium: ["new-field", "validation-logic", "api-integration"],
      high: ["payment-flow", "user-authentication", "data-migration"],
    };
  }

  /**
   * Analyze perubahan dan recommend testing strategy
   */
  analyzeChangeImpact(prDescription, changedFiles = []) {
    console.log("🔍 Analyzing change impact...");

    const extractor = new PRFieldExtractor();
    const fieldAnalysis = extractor.extractAllFields(
      prDescription,
      changedFiles
    );

    // Determine impact level
    const impactLevel = this.determineImpactLevel(
      prDescription,
      fieldAnalysis,
      changedFiles
    );

    // Generate recommendations for each BA type
    const recommendations = this.generateBARecommendations(
      impactLevel,
      fieldAnalysis
    );

    console.log(`   Impact Level: ${impactLevel.toUpperCase()}`);
    console.log(
      `   Affected Fields: ${fieldAnalysis.fields.join(", ") || "none"}`
    );

    return {
      impactLevel,
      fieldAnalysis,
      recommendations,
      changeContext: this.getChangeContext(prDescription, changedFiles),
    };
  }

  /**
   * Determine change impact level
   */
  determineImpactLevel(prDescription, fieldAnalysis, changedFiles) {
    const desc = prDescription.toLowerCase();
    const files = changedFiles.join(" ").toLowerCase();

    // High impact indicators
    const highImpactKeywords = [
      "payment",
      "checkout",
      "auth",
      "login",
      "security",
      "database",
      "migration",
      "api",
      "integration",
      "user flow",
      "workflow",
      "business logic",
    ];

    // Medium impact indicators
    const mediumImpactKeywords = [
      "validation",
      "form",
      "field",
      "required",
      "email",
      "phone",
      "address",
      "calculation",
    ];

    // Low impact indicators
    const lowImpactKeywords = [
      "text",
      "label",
      "styling",
      "css",
      "color",
      "font",
      "spacing",
      "layout",
      "typo",
    ];

    if (
      highImpactKeywords.some(
        (keyword) => desc.includes(keyword) || files.includes(keyword)
      )
    ) {
      return "high";
    } else if (
      mediumImpactKeywords.some(
        (keyword) => desc.includes(keyword) || files.includes(keyword)
      )
    ) {
      return "medium";
    } else if (
      lowImpactKeywords.some(
        (keyword) => desc.includes(keyword) || files.includes(keyword)
      )
    ) {
      return "low";
    }

    // Default to medium if uncertain
    return "medium";
  }

  /**
   * Generate testing recommendations untuk masing-masing tipe BA
   */
  generateBARecommendations(impactLevel, fieldAnalysis) {
    const recommendations = {};

    // BA Tipe A: Focused Tester
    recommendations.focused = this.generateFocusedStrategy(
      impactLevel,
      fieldAnalysis
    );

    // BA Tipe B: Comprehensive Tester
    recommendations.comprehensive = this.generateComprehensiveStrategy(
      impactLevel,
      fieldAnalysis
    );

    // BA Hybrid: Best of both worlds
    recommendations.hybrid = this.generateHybridStrategy(
      impactLevel,
      fieldAnalysis
    );

    return recommendations;
  }

  /**
   * Generate focused testing strategy
   */
  generateFocusedStrategy(impactLevel, fieldAnalysis) {
    const strategy = {
      profile: this.testingProfiles.focused,
      testPlan: [],
      playwrightCommands: [],
      estimatedTime: "5-15 minutes",
      coverage: "specific feature only",
    };

    // Focus hanya pada affected fields
    if (fieldAnalysis.fields.length > 0) {
      fieldAnalysis.fields.forEach((field) => {
        strategy.testPlan.push({
          scope: `${field} field validation`,
          tests: [`${field}-core.spec.js`],
          pages: ["current page only"],
          priority: "high",
        });

        strategy.playwrightCommands.push(
          `npx playwright test server/tests/core/${field}-core.spec.js`
        );
      });
    } else {
      // Generic focused testing
      strategy.testPlan.push({
        scope: "modified component only",
        tests: ["component-specific tests"],
        pages: ["affected page only"],
        priority: "high",
      });

      strategy.playwrightCommands.push(
        'npx playwright test --grep "modified component"'
      );
    }

    return strategy;
  }

  /**
   * Generate comprehensive testing strategy
   */
  generateComprehensiveStrategy(impactLevel, fieldAnalysis) {
    const strategy = {
      profile: this.testingProfiles.comprehensive,
      testPlan: [],
      playwrightCommands: [],
      estimatedTime: "30-60 minutes",
      coverage: "full sales journey (4-5 pages)",
    };

    // Test seluruh sales journey
    this.salesJourneyPages.forEach((page) => {
      strategy.testPlan.push({
        scope: `${page} functionality`,
        tests: [`${page}.spec.js`, `${page}-integration.spec.js`],
        pages: [page],
        priority: impactLevel === "high" ? "critical" : "normal",
      });
    });

    // Playwright commands untuk comprehensive testing
    strategy.playwrightCommands = [
      "npx playwright test server/tests/core/", // All core tests
      "npx playwright test server/tests/business/", // All business tests
      'npx playwright test --grep "sales-journey"', // End-to-end flow
      'npx playwright test --grep "regression"', // Regression tests
    ];

    // Add specific field tests if any
    if (fieldAnalysis.fields.length > 0) {
      fieldAnalysis.fields.forEach((field) => {
        strategy.testPlan.push({
          scope: `${field} field in full context`,
          tests: [`${field}-integration.spec.js`],
          pages: ["all relevant pages"],
          priority: "high",
        });
      });
    }

    return strategy;
  }

  /**
   * Generate hybrid testing strategy (smart combination)
   */
  generateHybridStrategy(impactLevel, fieldAnalysis) {
    const strategy = {
      profile: this.testingProfiles.hybrid,
      testPlan: [],
      playwrightCommands: [],
      estimatedTime: "15-30 minutes",
      coverage: "adaptive based on impact",
    };

    switch (impactLevel) {
      case "low":
        // Low impact: focused + smoke test
        strategy.testPlan = [
          ...this.generateFocusedStrategy(impactLevel, fieldAnalysis).testPlan,
          {
            scope: "smoke test critical path",
            tests: ["smoke-test.spec.js"],
            pages: ["key pages only"],
            priority: "medium",
          },
        ];
        break;

      case "medium":
        // Medium impact: focused + related pages
        strategy.testPlan = [
          ...this.generateFocusedStrategy(impactLevel, fieldAnalysis).testPlan,
          {
            scope: "related pages regression",
            tests: ["related-pages.spec.js"],
            pages: ["current + 1-2 related pages"],
            priority: "high",
          },
        ];
        break;

      case "high":
        // High impact: comprehensive testing required
        strategy.testPlan = this.generateComprehensiveStrategy(
          impactLevel,
          fieldAnalysis
        ).testPlan;
        break;
    }

    // Generate appropriate playwright commands
    if (impactLevel === "high") {
      strategy.playwrightCommands = this.generateComprehensiveStrategy(
        impactLevel,
        fieldAnalysis
      ).playwrightCommands;
    } else {
      strategy.playwrightCommands = [
        ...this.generateFocusedStrategy(impactLevel, fieldAnalysis)
          .playwrightCommands,
        'npx playwright test --grep "smoke"', // Add smoke tests
      ];
    }

    return strategy;
  }

  /**
   * Get change context untuk decision making
   */
  getChangeContext(prDescription, changedFiles) {
    return {
      description: prDescription,
      fileCount: changedFiles.length,
      fileTypes: this.analyzeFileTypes(changedFiles),
      keywords: this.extractKeywords(prDescription),
      urgency: this.determineUrgency(prDescription),
    };
  }

  /**
   * Analyze types of files changed
   */
  analyzeFileTypes(changedFiles) {
    const types = {
      frontend: 0,
      backend: 0,
      config: 0,
      test: 0,
      documentation: 0,
    };

    changedFiles.forEach((file) => {
      const ext = path.extname(file).toLowerCase();
      const fileName = file.toLowerCase();

      if (
        [".js", ".jsx", ".ts", ".tsx", ".vue", ".html", ".css"].includes(ext)
      ) {
        types.frontend++;
      } else if ([".py", ".java", ".php", ".rb", ".go"].includes(ext)) {
        types.backend++;
      } else if ([".json", ".yml", ".yaml", ".xml", ".env"].includes(ext)) {
        types.config++;
      } else if (fileName.includes("test") || fileName.includes("spec")) {
        types.test++;
      } else if ([".md", ".txt", ".doc"].includes(ext)) {
        types.documentation++;
      }
    });

    return types;
  }

  /**
   * Extract important keywords dari PR description
   */
  extractKeywords(description) {
    const keywords = [];
    const importantPatterns = [
      /fix\s+bug/i,
      /add\s+feature/i,
      /update\s+\w+/i,
      /remove\s+\w+/i,
      /refactor\s+\w+/i,
      /improve\s+\w+/i,
    ];

    importantPatterns.forEach((pattern) => {
      const match = description.match(pattern);
      if (match) {
        keywords.push(match[0].toLowerCase());
      }
    });

    return keywords;
  }

  /**
   * Determine urgency dari PR description
   */
  determineUrgency(description) {
    const urgentKeywords = [
      "urgent",
      "critical",
      "emergency",
      "hotfix",
      "asap",
    ];
    const normalKeywords = [
      "improvement",
      "enhancement",
      "refactor",
      "cleanup",
    ];

    const desc = description.toLowerCase();

    if (urgentKeywords.some((keyword) => desc.includes(keyword))) {
      return "urgent";
    } else if (normalKeywords.some((keyword) => desc.includes(keyword))) {
      return "normal";
    }

    return "medium";
  }

  /**
   * Generate BA-specific reports
   */
  generateBAReport(analysis) {
    const report = {
      timestamp: new Date().toISOString(),
      analysis,
      baGuidance: {
        focusedBA: {
          recommendation: "Test sesuai deskripsi saja",
          rationale: this.getFocusedRationale(analysis.impactLevel),
          timeEstimate: analysis.recommendations.focused.estimatedTime,
          testCommands: analysis.recommendations.focused.playwrightCommands,
        },
        comprehensiveBA: {
          recommendation: "Test full sales journey",
          rationale: this.getComprehensiveRationale(analysis.impactLevel),
          timeEstimate: analysis.recommendations.comprehensive.estimatedTime,
          testCommands:
            analysis.recommendations.comprehensive.playwrightCommands,
        },
        hybridBA: {
          recommendation: "Smart adaptive testing",
          rationale: this.getHybridRationale(analysis.impactLevel),
          timeEstimate: analysis.recommendations.hybrid.estimatedTime,
          testCommands: analysis.recommendations.hybrid.playwrightCommands,
        },
      },
    };

    // Save report
    const reportPath = path.join(
      __dirname,
      "../test-results/ba-testing-strategy.json"
    );
    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n💾 BA Testing Strategy Report saved: ${reportPath}`);
    } catch (error) {
      console.log(`\n❌ Failed to save report: ${error.message}`);
    }

    return report;
  }

  /**
   * Generate rationale untuk focused BA
   */
  getFocusedRationale(impactLevel) {
    switch (impactLevel) {
      case "low":
        return "Perubahan kecil, focused testing sudah cukup untuk catch issues.";
      case "medium":
        return "Perubahan moderate, focused testing efficient tapi perlu extra caution.";
      case "high":
        return "⚠️ PERINGATAN: Perubahan high-impact, pertimbangkan comprehensive testing.";
      default:
        return "Focused testing sesuai dengan scope perubahan.";
    }
  }

  /**
   * Generate rationale untuk comprehensive BA
   */
  getComprehensiveRationale(impactLevel) {
    switch (impactLevel) {
      case "low":
        return "Mungkin over-testing untuk perubahan kecil, tapi aman untuk catch regression.";
      case "medium":
        return "Good balance antara thoroughness dan efficiency untuk perubahan ini.";
      case "high":
        return "✅ SANGAT DIREKOMENDASIKAN: High-impact changes butuh comprehensive testing.";
      default:
        return "Comprehensive testing memberikan confidence maksimal.";
    }
  }

  /**
   * Generate rationale untuk hybrid BA
   */
  getHybridRationale(impactLevel) {
    return `Hybrid approach optimal untuk impact level ${impactLevel} - balance antara efficiency dan coverage.`;
  }

  /**
   * CLI interface untuk BA decision making
   */
  async runBAAnalysis(prDescription, changedFiles = []) {
    console.log("🎯 BA Testing Strategy Analysis");
    console.log("=".repeat(50));

    const analysis = this.analyzeChangeImpact(prDescription, changedFiles);
    const report = this.generateBAReport(analysis);

    // Display recommendations
    console.log("\n📊 RECOMMENDATIONS FOR DIFFERENT BA TYPES:");
    console.log("=".repeat(50));

    Object.entries(report.baGuidance).forEach(([baType, guidance]) => {
      console.log(`\n${baType.toUpperCase()} BA:`);
      console.log(`   📋 ${guidance.recommendation}`);
      console.log(`   💡 ${guidance.rationale}`);
      console.log(`   ⏱️  ${guidance.timeEstimate}`);
      console.log(
        `   🎯 Commands: ${guidance.testCommands.length} test commands`
      );
    });

    console.log(
      "\n🎉 Analysis Complete! Check the report for detailed commands."
    );

    return report;
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes("--help")) {
    console.log("🎯 BA Testing Strategy Manager - Help");
    console.log("Usage: node ba-testing-manager.js [options]");
    console.log("");
    console.log("Options:");
    console.log('  --pr-desc "text"    PR description to analyze');
    console.log('  --files "f1,f2"     Comma-separated list of changed files');
    console.log(
      '  --ba-type "type"    Specific BA type (focused|comprehensive|hybrid)'
    );
    console.log("  --help              Show this help");
    console.log("");
    console.log("Examples:");
    console.log(
      '  node ba-testing-manager.js --pr-desc "Fix phone validation bug"'
    );
    console.log(
      '  node ba-testing-manager.js --pr-desc "Add payment integration" --ba-type comprehensive'
    );
    return;
  }

  const prDescIndex = args.indexOf("--pr-desc");
  const filesIndex = args.indexOf("--files");
  const baTypeIndex = args.indexOf("--ba-type");

  const prDescription =
    prDescIndex !== -1 ? args[prDescIndex + 1] : "Sample change for testing";
  const changedFiles =
    filesIndex !== -1
      ? args[filesIndex + 1].split(",").map((f) => f.trim())
      : [];
  const baType = baTypeIndex !== -1 ? args[baTypeIndex + 1] : null;

  const manager = new BATestingManager();
  manager.runBAAnalysis(prDescription, changedFiles).then((report) => {
    if (baType && report.baGuidance[baType]) {
      console.log(`\n🎯 SPECIFIC GUIDANCE FOR ${baType.toUpperCase()} BA:`);
      console.log("=".repeat(40));
      const guidance = report.baGuidance[baType];
      console.log(`📋 ${guidance.recommendation}`);
      console.log(`💡 ${guidance.rationale}`);
      console.log(`⏱️  ${guidance.timeEstimate}`);
      console.log("\n🚀 Test Commands:");
      guidance.testCommands.forEach((cmd, i) => {
        console.log(`   ${i + 1}. ${cmd}`);
      });
    }
  });
}

module.exports = BATestingManager;
