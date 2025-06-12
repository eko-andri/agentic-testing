const callOllamaLLM = require("../utils/llmOllama");
const { setCurrentProgress } = require("./utils/progressStatus");

function cleanCodeOutput(code) {
  return code
    .split("\n")
    .filter((line) => !line.trim().startsWith("```"))
    .join("\n");
}

async function testGenerator(
  testPlan,
  testUrl = "http://localhost:3000/policy-form.html",
  formContext = null
) {
  // Get today's date dynamically
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  // Prompt yang bersih tanpa hardcoded logic
  const system = `You are a Playwright E2E test generator. Generate clean, working Playwright test code based on requirements and form context analysis.

Requirements:
- Use @playwright/test API
- Output ONLY JavaScript code, no markdown or explanations
- Each test scenario should be a separate test() function
- Use page.goto("${testUrl}") for all tests
- Include a helper function getErrorMessage(page) for form validation messages
- Use ONLY the selectors and strategies provided in the form context analysis
- Follow the exact testing strategies provided for each field type

IMPORTANT - Assertion Patterns:
- For SUCCESS scenarios: Use the success assertion code provided in the context
- For ERROR scenarios: Use the error assertion code provided in the context
- Do NOT use expect().toBeNull() for success scenarios
- Success scenarios should expect success messages to be present

Basic template structure:
const { test, expect } = require("@playwright/test");

async function getErrorMessage(page) {
  const messageLocator = page.locator("#form-message");
  await messageLocator.waitFor({ state: "visible", timeout: 1000 }).catch(() => {});
  const text = await messageLocator.textContent();
  return text?.trim() || null;
}

// Your test scenarios here based on the provided form context and assertion codes...`;

  // Tambahkan form context dari analisis struktur form
  let contextInfo = "";
  if (formContext && formContext.fields) {
    contextInfo += `\n\nForm Structure Analysis:`;

    // Tambahkan informasi submit button
    if (formContext.submitButton) {
      contextInfo += `\nSubmit Button: ${formContext.submitButton.selector}`;
      if (formContext.submitButton.text) {
        contextInfo += ` (text: "${formContext.submitButton.text}")`;
      }
    }

    // Tambahkan informasi form selector
    if (formContext.formSelector) {
      contextInfo += `\nForm Selector: ${formContext.formSelector}`;
    }

    // Tambahkan detail field dengan testing strategies
    contextInfo += `\nForm Fields:`;
    for (const [fieldId, fieldInfo] of Object.entries(formContext.fields)) {
      contextInfo += `\n- Field: ${fieldId} (${fieldInfo.label})`;
      contextInfo += `\n  Selector: ${fieldInfo.selector}`;
      contextInfo += `\n  Type: ${fieldInfo.type}`;
      contextInfo += `\n  Required: ${fieldInfo.required}`;

      if (fieldInfo.validation && fieldInfo.validation.length > 0) {
        contextInfo += `\n  Validations: ${fieldInfo.validation.join(", ")}`;
      }

      if (fieldInfo.messages && Object.keys(fieldInfo.messages).length > 0) {
        contextInfo += `\n  Expected Messages:`;
        for (const [msgType, msgText] of Object.entries(fieldInfo.messages)) {
          contextInfo += `\n    ${msgType}: "${msgText}"`;
        }
      }

      if (
        fieldInfo.testingStrategies &&
        fieldInfo.testingStrategies.length > 0
      ) {
        contextInfo += `\n  Testing Strategies:`;
        for (const strategy of fieldInfo.testingStrategies) {
          contextInfo += `\n    ${strategy.scenario}: ${strategy.description}`;
          if (strategy.codeTemplate) {
            contextInfo += `\n      Code Template: ${strategy.codeTemplate}`;
          } else {
            contextInfo += `\n      Method: ${strategy.method} with value "${strategy.value}"`;
          }
        }
      }
    }

    // Tambahkan recommended test scenarios
    if (formContext.recommendedTestScenarios) {
      contextInfo += `\n\nRecommended Test Scenarios:`;
      for (const scenario of formContext.recommendedTestScenarios) {
        contextInfo += `\n- ${scenario.name}: ${scenario.description}`;
        contextInfo += `\n  Expected: ${scenario.expectedResult} - "${scenario.expectedMessage}"`;
        contextInfo += `\n  Assertion Type: ${
          scenario.assertionType || "standard"
        }`;
        if (scenario.steps) {
          contextInfo += `\n  Steps:`;
          for (const step of scenario.steps) {
            if (step.code) {
              contextInfo += `\n    ${step.code}`;
            } else {
              contextInfo += `\n    ${step.action} on ${step.selector} with "${step.value}"`;
            }
          }
        }
        if (scenario.assertionCode) {
          contextInfo += `\n  Assertion Code: ${scenario.assertionCode}`;
        }
      }
    }
  }

  const userPrompt = `Generate Playwright E2E test code for:\n${testPlan}${contextInfo}\n\nGenerate comprehensive test scenarios covering all acceptance criteria. Use ${testUrl} as the target URL.`;
  const combinedPrompt = `${system}\n\n${userPrompt}`;

  setCurrentProgress({
    status: "Test Generator Agent:\nGenerating Playwright code...",
    prompt: combinedPrompt,
  });

  let code;
  try {
    code = await callOllamaLLM({ prompt: combinedPrompt });
    setCurrentProgress({
      status: "Test Generator Agent:\nPlaywright code generated.",
      prompt: combinedPrompt,
      playwrightCode: code,
    });
  } catch (err) {
    setCurrentProgress({
      status: "Test Generator Agent:\nError generating Playwright code.",
      prompt: combinedPrompt,
    });
    console.error("[ERROR] testGenerator LLM:", err);
    throw err;
  }
  code = cleanCodeOutput(code);
  // Hapus HTML jika masih ada (LLM bandel)
  code = code.replace(/<html[\s\S]*?<\/html>/gi, "").trim();
  // Hapus backtick jika masih ada
  code = code.replace(/```[a-z]*|```/gi, "").trim();
  // Normalisasi baris kosong ganda
  code = code.replace(/\n{3,}/g, "\n\n");
  // Normalisasi indentasi dan spasi
  code = code.replace(/\r/g, "");

  // Validasi dasar hasil LLM - pastikan memiliki struktur yang benar
  const hasRequire =
    code.includes('const { test, expect } = require("@playwright/test");') ||
    code.includes("const { test, expect } = require('@playwright/test');");
  const hasHelper =
    code.includes("async function getErrorMessage") ||
    code.includes("async function getErrorMessage");
  const hasTest = code.includes("test(");

  if (!hasRequire || !hasHelper || !hasTest) {
    console.warn(
      "[WARNING] Generated code missing required structure, using basic fallback"
    );
    // Fallback minimal tanpa hardcoded logic - bergantung pada form context
    const fallbackCode = `const { test, expect } = require("@playwright/test");

async function getErrorMessage(page) {
  const messageLocator = page.locator("#form-message");
  await messageLocator.waitFor({ state: "visible", timeout: 1000 }).catch(() => {});
  const text = await messageLocator.textContent();
  return text?.trim() || null;
}

test("Basic Form Test", async ({ page }) => {
  await page.goto("${testUrl}");
  ${
    formContext && formContext.submitButton
      ? `await page.click("${formContext.submitButton.selector}");`
      : 'await page.click("button[type=\\"submit\\"]");'
  }
  // Please regenerate with more specific requirements
});`;
    return fallbackCode;
  }

  return code;
}

function generateTestCode(testPlan, { ticketNumber, framework = "jest" }) {
  // Example: change testPlan into simple test code
  // (Real implementation: use LLM or template engine)
  return `
/**
 * Auto-generated test for Ticket: ${ticketNumber}
 */
describe('E2E Test for ${ticketNumber}', () => {
  it('should follow the scenario', () => {
    // ${testPlan.split("\n").join("\n    // ")}
  });
});
  `.trim();
}

module.exports = { testGenerator, generateTestCode };
