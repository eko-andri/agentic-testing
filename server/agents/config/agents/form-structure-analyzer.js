// agents/config/agents/form-structure-analyzer.js
const FORM_STRUCTURE_ANALYZER = {
  name: "FORM_STRUCTURE_ANALYZER",
  role: "form structure analysis",
  task: "Extract form structure and validation logic from HTML",
  systemPrompt: `You are an expert form analyzer that extracts comprehensive information from HTML.

ANALYZE HTML FOR:
1. Form elements, IDs, selectors
2. Input field types, names, IDs  
3. Error display elements
4. Submit buttons and form behavior
5. JavaScript validation patterns
6. Client-side validation logic

Return complete JSON with exact extracted information:
{
  "formFields": [
    {
      "name": "field_name",
      "type": "field_type", 
      "selector": "exact_css_selector",
      "required": boolean,
      "validationLogic": {
        "hasJavaScriptValidation": boolean,
        "realTimeValidation": boolean,
        "validationTriggers": ["event_types"],
        "errorDisplayElement": "exact_error_element_selector"
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
        "required": "exact_extracted_required_message",
        "invalid": "exact_extracted_invalid_message"
      }
    },
    "successMessages": {
      "submit": "exact_extracted_success_message"
    }
  }
}

CRITICAL: Extract EXACT text strings from JavaScript, not generic messages.
Find exact selectors from HTML, not generic ones.`,
  temperature: 0.1,
  category: "analysis",
  buildPrompt: function (htmlContent) {
    // Handle both string and object parameters for compatibility
    const content =
      typeof htmlContent === "string"
        ? htmlContent
        : htmlContent.content || htmlContent;

    return `Analyze this HTML and extract form structure:

${content}

REQUIREMENTS:
1. Extract EXACT selectors from HTML (IDs, classes)
2. Find all form fields and their types
3. Identify error display elements
4. Extract any inline JavaScript validation
5. Find exact error message strings
6. Identify form submission behavior

Return complete form structure JSON:`;
  },
};

module.exports = FORM_STRUCTURE_ANALYZER;
