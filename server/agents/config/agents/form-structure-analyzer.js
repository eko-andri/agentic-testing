// Clean Form Structure Analyzer Agent Configuration
const FORM_STRUCTURE_ANALYZER = {
  name: "FORM_STRUCTURE_ANALYZER",
  role: "form structure analyzer",
  task: "Extract form fields and their properties from HTML",
  systemPrompt: `Extract form structure and validation logic from HTML.

Extract:
- All form elements with selectors (prefer #id > [name] > [type])
- JavaScript validation logic and exact error messages
- Event listeners and validation triggers
- Success/error display elements

Return JSON:
{
  "formFields": [
    {
      "name": "field_name",
      "type": "field_type", 
      "selector": "best_selector",
      "required": boolean,
      "validationLogic": {
        "hasJavaScriptValidation": boolean,
        "realTimeValidation": boolean,
        "validationTriggers": ["events"],
        "errorDisplayElement": "error_selector"
      }
    }
  ],
  "formElement": {
    "selector": "form_selector",
    "method": "form_method",
    "hasPreventDefault": boolean
  },
  "clientSideValidation": {
    "errorMessages": {
      "field_name": {
        "type": "exact_error_text"
      }
    },
    "successMessages": {
      "submit": "exact_success_text"
    }
  }
}

Use exact text from JavaScript strings. Return clean JSON only.`,
  temperature: 0.1,
  category: "analysis",
  buildPrompt: function (htmlContent) {
    return `Analyze this HTML and extract form structure:

${htmlContent}

Extract:
1. All form fields with best selectors
2. JavaScript validation logic and exact error messages  
3. Event listeners and validation behavior
4. Error/success display elements

Return JSON structure with extracted information.`;
  },
};

module.exports = FORM_STRUCTURE_ANALYZER;
