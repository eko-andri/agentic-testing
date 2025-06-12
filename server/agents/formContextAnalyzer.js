const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { setCurrentProgress } = require("./utils/progressStatus");

async function analyzeFormContext(testUrl) {
  try {
    setCurrentProgress({
      status: "Form Context Analyzer:\nParsing HTML structure...",
      prompt: `Analyzing form at: ${testUrl}`,
    });

    const filename = path.basename(new URL(testUrl).pathname); // e.g. policy-form.html
    const htmlPath = path.join(__dirname, "..", "..", filename); // Go up to root directory

    if (!fs.existsSync(htmlPath)) {
      throw new Error(`HTML file not found: ${htmlPath}`);
    }

    const html = fs.readFileSync(htmlPath, "utf-8");

    const $ = cheerio.load(html);
    const context = {
      formUrl: testUrl,
      fields: {},
      submitButton: null,
      formSelector: null,
    };

    // Extract form information
    const form = $("form").first();
    if (form.length > 0) {
      const formId = form.attr("id");
      context.formSelector = formId ? `#${formId}` : "form";
    }

    // Extract submit button information
    const submitBtn = $('button[type="submit"], input[type="submit"]').first();
    if (submitBtn.length > 0) {
      const btnId = submitBtn.attr("id");
      const btnType = submitBtn.attr("type");
      const btnText = submitBtn.text() || submitBtn.attr("value");

      context.submitButton = {
        selector: btnId ? `#${btnId}` : `button[type="${btnType}"]`,
        type: btnType,
        text: btnText,
      };
    }

    // Extract input/select/textarea
    $("input, select, textarea").each((_, el) => {
      const id = $(el).attr("id");
      const name = $(el).attr("name");
      const type = $(el).attr("type") || "text";
      const required = $(el).attr("required") !== undefined;
      const placeholder = $(el).attr("placeholder");
      const label = $(`label[for="${id}"]`).text().trim();

      if (id) {
        context.fields[id] = {
          selector: `#${id}`,
          type,
          required,
          placeholder,
          label: label || name || id,
          validation: [], // akan diisi berdasarkan analisis script
          messages: {},
          testingStrategies: [], // strategi khusus untuk testing field ini
        };

        // Tambahkan strategi testing khusus berdasarkan tipe field
        if (type === "date") {
          context.fields[id].testingStrategies.push({
            scenario: "valid_input",
            method: "fill",
            value: "YYYY-MM-DD",
            description:
              "Fill with a valid date in YYYY-MM-DD format that meets requirements",
            codeTemplate: `// Calculate valid date for age requirement
const today = new Date();
const validDate = new Date(today.getFullYear() - 20, today.getMonth(), today.getDate());
await page.locator("${
              id ? `#${id}` : `[name="${name}"]`
            }").fill(validDate.toISOString().split("T")[0]);`,
          });
          context.fields[id].testingStrategies.push({
            scenario: "invalid_input",
            method: "javascript_override",
            value: "invalid-date-string",
            description:
              "Override value property to simulate invalid date input",
            codeTemplate: `// Test invalid date input
const ${id}Field = page.locator("${id ? `#${id}` : `[name="${name}"]`}");
await ${id}Field.fill("2020-01-01"); 
await page.evaluate(() => {
  const input = document.getElementById("${id}");
  Object.defineProperty(input, 'value', {
    get: function() { return 'invalid-date-string'; },
    configurable: true
  });
});`,
          });
          context.fields[id].testingStrategies.push({
            scenario: "empty_input",
            method: "clear",
            value: "",
            description: "Leave field empty to test required validation",
            codeTemplate: `// Test empty date field
await page.locator("${id ? `#${id}` : `[name="${name}"]`}").clear();`,
          });
          context.fields[id].testingStrategies.push({
            scenario: "underage_input",
            method: "calculated_date",
            value: "calculated_underage_date",
            description: "Fill with date that makes user underage",
            codeTemplate: `// Calculate underage date (less than required age)
const today = new Date();
const underageDate = new Date(today.getFullYear() - 15, today.getMonth(), today.getDate());
await page.locator("${
              id ? `#${id}` : `[name="${name}"]`
            }").fill(underageDate.toISOString().split("T")[0]);`,
          });
        } else if (type === "email") {
          context.fields[id].testingStrategies.push({
            scenario: "valid_input",
            method: "fill",
            value: "test@example.com",
            description: "Fill with valid email format",
          });
          context.fields[id].testingStrategies.push({
            scenario: "invalid_input",
            method: "fill",
            value: "invalid-email",
            description: "Fill with invalid email format",
          });
        } else {
          context.fields[id].testingStrategies.push({
            scenario: "valid_input",
            method: "fill",
            value: "valid_test_value",
            description: "Fill with valid test value",
          });
          if (required) {
            context.fields[id].testingStrategies.push({
              scenario: "empty_input",
              method: "clear",
              value: "",
              description: "Leave required field empty",
            });
          }
        }
      }
    });

    // Extract error/success messages dari inline script dan analisis validation logic
    const scripts = $("script")
      .map((_, el) => $(el).html())
      .get()
      .join("\n");

    // Mapping pesan error yang lebih komprehensif
    const regexMap = [
      {
        key: "empty",
        pattern: /"([^"]*(?:empty|required|cannot be empty)[^"]*)"/gi,
      },
      {
        key: "invalid",
        pattern: /"([^"]*(?:invalid|only dates|must accept only)[^"]*)"/gi,
      },
      {
        key: "minAge",
        pattern: /"([^"]*(?:Minimum age|age requirement)[^"]*)"/gi,
      },
      { key: "success", pattern: /"([^"]*(?:successfully|success)[^"]*)"/gi },
      { key: "format", pattern: /"([^"]*(?:format|pattern)[^"]*)"/gi },
    ];

    // Analisis validation rules berdasarkan JavaScript logic
    for (const field in context.fields) {
      const fieldInfo = context.fields[field];

      // Extract messages untuk field ini
      for (const { key, pattern } of regexMap) {
        let match;
        while ((match = pattern.exec(scripts)) !== null) {
          if (!fieldInfo.messages[key]) {
            fieldInfo.messages[key] = match[1];
          }
        }
      }

      // Analisis validation logic berdasarkan script content
      if (scripts.includes(`!document.getElementById("${field}").value`)) {
        fieldInfo.validation.push("nonEmpty");
      }
      if (scripts.includes(`new Date(`) && scripts.includes(field)) {
        fieldInfo.validation.push("validDate");
      }
      if (scripts.includes("age <") || scripts.includes("age>=")) {
        const ageMatch = scripts.match(/age\s*[<>=]+\s*(\d+)/);
        if (ageMatch) {
          fieldInfo.validation.push(`minAge:${ageMatch[1]}`);
          // Update testing strategy untuk age validation
          if (fieldInfo.type === "date") {
            fieldInfo.testingStrategies.push({
              scenario: "underage_input",
              method: "calculated_date",
              value: `calculated_underage_date`,
              description: `Fill with date that makes age less than ${ageMatch[1]} years`,
              ageRequirement: parseInt(ageMatch[1]),
              codeTemplate: `// Calculate underage date (less than ${
                ageMatch[1]
              } years)
const today = new Date();
const underageDate = new Date(today.getFullYear() - ${
                parseInt(ageMatch[1]) - 1
              }, today.getMonth(), today.getDate());
await page.locator("${
                fieldInfo.selector
              }").fill(underageDate.toISOString().split("T")[0]);`,
            });
          }
        }
      }
      if (scripts.includes("isNaN")) {
        fieldInfo.validation.push("validFormat");
      }
    }

    setCurrentProgress({
      status: "Form Context Analyzer:\nForm structure analysis complete.",
      prompt: `Found ${
        Object.keys(context.fields).length
      } form fields with validations and messages.`,
    });

    // Generate recommended test scenarios berdasarkan analisis form
    context.recommendedTestScenarios = generateTestScenarios(context);

    return context;
  } catch (error) {
    setCurrentProgress({
      status: "Form Context Analyzer:\nError analyzing form structure.",
      prompt: `Error: ${error.message}`,
    });
    throw error;
  }
}

function generateTestScenarios(context) {
  const scenarios = [];

  // Scenario 1: Valid form submission
  scenarios.push({
    name: "Valid Form Submission",
    description: "Submit form with all valid inputs",
    expectedResult: "success",
    expectedMessage:
      Object.values(context.fields)[0]?.messages?.success ||
      "Form submitted successfully",
    assertionType: "success_message", // Tambahkan tipe assertion yang jelas
    steps: Object.entries(context.fields).map(([fieldId, fieldInfo]) => {
      const validStrategy = fieldInfo.testingStrategies.find(
        (s) => s.scenario === "valid_input"
      );
      return {
        action: validStrategy?.method || "fill",
        selector: fieldInfo.selector,
        value: validStrategy?.value || "test_value",
        fieldType: fieldInfo.type,
        code:
          validStrategy?.codeTemplate ||
          `await page.locator("${fieldInfo.selector}").fill("${
            validStrategy?.value || "test_value"
          }");`,
      };
    }),
    assertionCode: `// For success scenario, expect success message
const message = await getErrorMessage(page);
expect(message).toContain("Form submitted successfully.");`,
  });

  // Scenario untuk setiap field: empty validation
  Object.entries(context.fields).forEach(([fieldId, fieldInfo]) => {
    if (fieldInfo.required) {
      scenarios.push({
        name: `Empty ${fieldInfo.label || fieldId} Field`,
        description: `Submit form with empty ${
          fieldInfo.label || fieldId
        } field`,
        expectedResult: "error",
        expectedMessage:
          fieldInfo.messages.empty ||
          `${fieldInfo.label || fieldId} field is required`,
        assertionType: "error_message",
        focusField: fieldId,
        steps: [
          {
            action: "skip_field",
            selector: fieldInfo.selector,
            fieldType: fieldInfo.type,
          },
        ],
        assertionCode: `const errorMessage = await getErrorMessage(page);
expect(errorMessage).toBe("${
          fieldInfo.messages.empty ||
          `${fieldInfo.label || fieldId} field is required`
        }");`,
      });
    }

    // Scenario untuk invalid input berdasarkan tipe field
    const invalidStrategy = fieldInfo.testingStrategies.find(
      (s) => s.scenario === "invalid_input"
    );
    if (invalidStrategy) {
      scenarios.push({
        name: `Invalid ${fieldInfo.label || fieldId} Input`,
        description: `Submit form with invalid ${
          fieldInfo.label || fieldId
        } input`,
        expectedResult: "error",
        expectedMessage:
          fieldInfo.messages.invalid ||
          `Invalid ${fieldInfo.label || fieldId} format`,
        assertionType: "error_message",
        focusField: fieldId,
        steps: [
          {
            action: invalidStrategy.method,
            selector: fieldInfo.selector,
            value: invalidStrategy.value,
            fieldType: fieldInfo.type,
            code:
              invalidStrategy.codeTemplate ||
              `await page.locator("${fieldInfo.selector}").fill("${invalidStrategy.value}");`,
          },
        ],
        assertionCode: `const errorMessage = await getErrorMessage(page);
expect(errorMessage).toBe("${
          fieldInfo.messages.invalid ||
          `Invalid ${fieldInfo.label || fieldId} format`
        }");`,
      });
    }

    // Scenario khusus untuk age validation
    const ageStrategy = fieldInfo.testingStrategies.find(
      (s) => s.scenario === "underage_input"
    );
    if (ageStrategy) {
      scenarios.push({
        name: `Underage ${fieldInfo.label || fieldId} Input`,
        description: `Submit form with ${
          fieldInfo.label || fieldId
        } that makes user underage`,
        expectedResult: "error",
        expectedMessage: fieldInfo.messages.minAge || "Age requirement not met",
        assertionType: "error_message",
        focusField: fieldId,
        ageRequirement: ageStrategy.ageRequirement,
        steps: [
          {
            action: ageStrategy.method,
            selector: fieldInfo.selector,
            value: ageStrategy.value,
            fieldType: fieldInfo.type,
            ageRequirement: ageStrategy.ageRequirement,
            code: ageStrategy.codeTemplate,
          },
        ],
        assertionCode: `const errorMessage = await getErrorMessage(page);
expect(errorMessage).toBe("${
          fieldInfo.messages.minAge || "Age requirement not met"
        }");`,
      });
    }
  });

  return scenarios;
}

module.exports = { analyzeFormContext };
