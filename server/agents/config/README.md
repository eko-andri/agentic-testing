# Agent Configuration Management

This project has been refactored to separate each agent's configuration into individual files to improve maintainability and code organization.

## Folder Structure

```
server/agents/config/
├── index.js                    # Central import point
├── prompts.js                  # Main file with ConfigHelper class and DEFAULT_OPTIONS
├── framework-templates.js      # Framework templates (Playwright, Cypress, Selenium)
├── README.md                   # Documentation
└── agents/
    ├── form-structure-analyzer.js
    ├── intelligent-test-generator.js
    ├── test-quality-auditor.js
    └── test-code-generator.js
```

## How to Use

### Import All Configurations

```javascript
const {
  AGENTS_CONFIG,
  FRAMEWORK_TEMPLATES,
  DEFAULT_OPTIONS,
  ConfigHelper,
} = require("./server/agents/config/prompts");
```

### Import a Specific Agent

```javascript
const FORM_STRUCTURE_ANALYZER = require("./server/agents/config/agents/form-structure-analyzer");
const FORM_QUALITY_AUDITOR = require("./server/agents/config/agents/test-quality-auditor");
```

### Using ConfigHelper

```javascript
// Get agent by name
const agent = ConfigHelper.getAgent("FORM_STRUCTURE_ANALYZER");

// Build a prompt for an agent
const prompt = ConfigHelper.buildPrompt(
  "INTELLIGENT_TEST_GENERATOR",
  formStructure,
  description
);

// Get a framework template
const template = ConfigHelper.getFrameworkTemplate("playwright");

// Debug available agents
ConfigHelper.debugAgentConfig();
```

## Benefits of Refactoring

### ✅ **Maintainability**

- Each agent has its own configuration file
- Easy to modify one agent's configuration without affecting others
- Code is more organized and easier to read

### ✅ **Scalability**

- Easy to add new agents by creating separate files
- Consistent structure for all agents
- Clean import/export

### ✅ **Debugging**

- Easier to track issues in specific agents
- Agent configurations are isolated from each other
- Helper methods for debugging are available

### ✅ **Collaboration**

- Developers can work on different agents without conflicts
- Code reviews can focus on individual agents
- Git history is cleaner

## Adding a New Agent

1. **Create a new agent file:**

```javascript
// agents/new-agent.js
const NEW_AGENT = {
  name: "NEW_AGENT",
  role: "agent role description",
  task: "agent task description",
  systemPrompt: `Your system prompt here...`,
  temperature: 0.1,
  category: "analysis|validation|generation",
  buildPrompt: function (param1, param2) {
    return `Your dynamic prompt here...`;
  },
};

module.exports = NEW_AGENT;
```

2. **Update index.js:**

```javascript
const NEW_AGENT = require("./agents/new-agent");

const AGENTS_CONFIG = [
  // ...existing agents...
  NEW_AGENT,
];

module.exports = {
  // ...existing exports...
  NEW_AGENT,
};
```

## Framework Template

To add a new testing framework, edit `framework-templates.js`:

```javascript
const FRAMEWORK_TEMPLATES = {
  // ...existing frameworks...
  newFramework: {
    imports: `// Your framework imports`,
    helpers: `// Your helper functions`,
    testStructure: (testUrl) => `// Your test structure`,
  },
};
```

## Best Practices

1. **Naming Convention**: Use kebab-case for file names (e.g., `test-quality-auditor.js`)
2. **Agent Names**: Use UPPER_SNAKE_CASE for agent names (e.g., `FORM_QUALITY_AUDITOR`)
3. **Documentation**: Add comments to each agent to explain its function
4. **Testing**: Test each agent separately after making modifications
5. **Version Control**: Commit changes per agent for a clean history

## Migration from Older Versions

If you are using an older version that still uses a single configuration file:

1. Import remains the same from `prompts.js`
2. All ConfigHelper functions are still available
3. No breaking changes for existing code
4. The AGENTS_CONFIG structure remains the same

## Troubleshooting

### Error: Cannot find module

- Make sure the import path is correct
- Check if the agent file has been exported correctly

### Error: Agent not found

- Use `ConfigHelper.debugAgentConfig()` to see available agents
- Check the agent name (case-sensitive)

### Error: buildPrompt function not found

- Make sure the agent has a `buildPrompt` method
- Check the parameters passed to `buildPrompt`

## Contribution

When adding or modifying an agent:

1. Follow the existing structure and conventions
2. Update documentation if needed
3. Test the configuration after changes
4. Commit with a descriptive message
