/**
 * Live UI Analyzer - Reads and analyzes running web applications
 * This is the foundation for package integration
 */

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

class LiveUIAnalyzer {
  constructor(options = {}) {
    this.options = {
      headless: options.headless !== false, // Default to headless
      timeout: options.timeout || 30000,
      baseUrl: options.baseUrl || "http://127.0.0.1:5500",
      ...options,
    };
    this.browser = null;
    this.page = null;
  }

  /**
   * Initialize browser and page
   */
  async initialize() {
    console.log("🚀 Initializing Live UI Analyzer...");

    this.browser = await puppeteer.launch({
      headless: this.options.headless,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    this.page = await this.browser.newPage();

    // Set viewport for consistent analysis
    await this.page.setViewport({ width: 1280, height: 720 });

    console.log("✅ Browser initialized");
  }

  /**
   * Navigate to the live application
   */
  async navigateToApp(path = "/policy-form.html") {
    const url = `${this.options.baseUrl}${path}`;
    console.log(`🌐 Navigating to: ${url}`);

    try {
      console.log("   ⏳ Loading page...");
      await this.page.goto(url, {
        waitUntil: "domcontentloaded", // Change from networkidle0 to domcontentloaded
        timeout: this.options.timeout,
      });

      // Wait a bit more for dynamic content
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log("✅ Successfully loaded the application");
      return true;
    } catch (error) {
      console.error("❌ Failed to load application:", error.message);

      // Try alternative wait strategy
      try {
        console.log("   🔄 Trying alternative loading strategy...");
        await this.page.goto(url, {
          waitUntil: "load",
          timeout: this.options.timeout,
        });
        console.log("✅ Successfully loaded with alternative strategy");
        return true;
      } catch (retryError) {
        throw new Error(
          `Cannot access live application at ${url}. Make sure Live Server is running! Original error: ${error.message}`
        );
      }
    }
  }

  /**
   * Analyze the current page's DOM structure
   */
  async analyzePage() {
    console.log("🔍 Analyzing live UI structure...");

    const analysis = await this.page.evaluate(() => {
      // This runs in the browser context
      const forms = Array.from(document.querySelectorAll("form"));
      const analysis = {
        url: window.location.href,
        title: document.title,
        forms: [],
        interactiveElements: [],
        validationRules: {},
        businessContext: {},
      };

      forms.forEach((form, index) => {
        const formAnalysis = {
          index,
          id: form.id || `form-${index}`,
          action: form.action || "",
          method: form.method || "GET",
          fields: [],
          buttons: [],
        };

        // Analyze form fields
        const inputs = form.querySelectorAll("input, select, textarea");
        inputs.forEach((input) => {
          const field = {
            type: input.type || input.tagName.toLowerCase(),
            name: input.name || "",
            id: input.id || "",
            required: input.required,
            placeholder: input.placeholder || "",
            value: input.value || "",
            pattern: input.pattern || "",
            min: input.min || "",
            max: input.max || "",
            minlength: input.minlength || "",
            maxlength: input.maxlength || "",
            selector: generateSelector(input),
            label: findAssociatedLabel(input),
            validationMessage: input.validationMessage || "",
          };

          formAnalysis.fields.push(field);
        });

        // Analyze buttons
        const buttons = form.querySelectorAll(
          'button, input[type="submit"], input[type="button"]'
        );
        buttons.forEach((button) => {
          formAnalysis.buttons.push({
            type: button.type || "button",
            text: button.textContent || button.value || "",
            id: button.id || "",
            name: button.name || "",
            selector: generateSelector(button),
          });
        });

        analysis.forms.push(formAnalysis);
      });

      // Analyze interactive elements outside forms
      const interactives = document.querySelectorAll(
        'button, a, [onclick], [role="button"]'
      );
      interactives.forEach((el) => {
        if (!el.closest("form")) {
          // Only elements outside forms
          analysis.interactiveElements.push({
            tagName: el.tagName.toLowerCase(),
            text: el.textContent.trim(),
            href: el.href || "",
            id: el.id || "",
            className: el.className || "",
            selector: generateSelector(el),
          });
        }
      });

      // Business context detection (specific to policy form)
      if (
        document.title.toLowerCase().includes("policy") ||
        document.querySelector(
          '[name*="dob"], [id*="dob"], [name*="birth"], [id*="birth"]'
        )
      ) {
        analysis.businessContext = {
          type: "policy-form",
          hasAgeValidation: !!document.querySelector(
            '[name*="dob"], [id*="dob"]'
          ),
          hasContactInfo: !!document.querySelector(
            '[name*="email"], [type="email"]'
          ),
          hasPolicyTypes: !!document.querySelector(
            '[name*="policy"], [name*="coverage"]'
          ),
        };
      }

      // Helper functions (defined in browser context)
      function generateSelector(element) {
        if (element.id) return `#${element.id}`;
        if (element.name) return `[name="${element.name}"]`;
        if (element.className) {
          const classes = element.className
            .split(" ")
            .filter((c) => c.length > 0);
          if (classes.length > 0) return `.${classes[0]}`;
        }
        return element.tagName.toLowerCase();
      }

      function findAssociatedLabel(input) {
        // Try to find label by 'for' attribute
        if (input.id) {
          const label = document.querySelector(`label[for="${input.id}"]`);
          if (label) return label.textContent.trim();
        }

        // Try to find parent label
        const parentLabel = input.closest("label");
        if (parentLabel) return parentLabel.textContent.trim();

        // Try to find sibling label
        const prevSibling = input.previousElementSibling;
        if (prevSibling && prevSibling.tagName === "LABEL") {
          return prevSibling.textContent.trim();
        }

        return input.placeholder || input.name || "";
      }

      return analysis;
    });

    console.log("✅ UI analysis completed");
    console.log(`   Forms found: ${analysis.forms.length}`);
    console.log(
      `   Interactive elements: ${analysis.interactiveElements.length}`
    );

    return analysis;
  }

  /**
   * Capture screenshot of current state
   */
  async captureScreenshot(filename = "live-ui-analysis.png") {
    const screenshotPath = path.join(__dirname, "screenshots", filename);

    // Ensure screenshots directory exists
    const screenshotDir = path.dirname(screenshotPath);
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    await this.page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });

    console.log(`📸 Screenshot saved: ${screenshotPath}`);
    return screenshotPath;
  }

  /**
   * Test form interactions (optional validation)
   */
  async testFormInteractions(formIndex = 0) {
    console.log("🧪 Testing form interactions...");

    const interactions = await this.page.evaluate((formIndex) => {
      const form = document.querySelectorAll("form")[formIndex];
      if (!form) return { error: "Form not found" };

      const results = {
        formId: form.id || `form-${formIndex}`,
        interactions: [],
      };

      const inputs = form.querySelectorAll("input, select, textarea");
      inputs.forEach((input, index) => {
        const interaction = {
          field: input.name || input.id || `field-${index}`,
          type: input.type || input.tagName.toLowerCase(),
          canFocus: false,
          canInput: false,
          hasValidation: false,
        };

        try {
          // Test focus
          input.focus();
          interaction.canFocus = document.activeElement === input;

          // Test input (for text fields)
          if (["text", "email", "tel", "date", "number"].includes(input.type)) {
            const originalValue = input.value;
            input.value = "test-value";
            interaction.canInput = input.value === "test-value";
            input.value = originalValue; // Restore
          }

          // Check validation
          interaction.hasValidation =
            input.required || !!input.pattern || !!input.min || !!input.max;
        } catch (error) {
          interaction.error = error.message;
        }

        results.interactions.push(interaction);
      });

      return results;
    }, formIndex);

    console.log("✅ Form interaction testing completed");
    return interactions;
  }

  /**
   * Generate comprehensive analysis report
   */
  async generateAnalysisReport() {
    const analysis = await this.analyzePage();
    const screenshot = await this.captureScreenshot();
    const interactions = await this.testFormInteractions();

    const report = {
      timestamp: new Date().toISOString(),
      url: analysis.url,
      title: analysis.title,
      screenshot,
      structure: analysis,
      interactions,
      recommendations: this.generateRecommendations(analysis),
    };

    // Save report
    const reportPath = path.join(
      __dirname,
      "reports",
      `live-ui-analysis-${Date.now()}.json`
    );
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📋 Analysis report saved: ${reportPath}`);

    return report;
  }

  /**
   * Generate testing recommendations based on analysis
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    analysis.forms.forEach((form, index) => {
      recommendations.push({
        type: "test-scenarios",
        form: form.id,
        scenarios: [
          "Happy path - valid data submission",
          "Validation testing - required fields",
          "Validation testing - invalid formats",
          "Edge cases - boundary values",
        ],
      });

      // Age validation specific recommendations
      if (analysis.businessContext.hasAgeValidation) {
        recommendations.push({
          type: "age-validation",
          form: form.id,
          tests: [
            "Test minimum age requirement (16+ years)",
            "Test edge case - exactly 16 years old",
            "Test invalid age - under minimum",
            "Test future dates - invalid DOB",
          ],
        });
      }

      // Email validation recommendations
      if (form.fields.some((f) => f.type === "email")) {
        recommendations.push({
          type: "email-validation",
          form: form.id,
          tests: [
            "Valid email formats",
            "Invalid email formats",
            "Empty email field (if required)",
            "Special characters in email",
          ],
        });
      }
    });

    return recommendations;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.page) {
      await this.page.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
    console.log("🧹 Cleanup completed");
  }
}

module.exports = LiveUIAnalyzer;
