// agents/config/prompts.js - Refactored to use modular agent configurations

// Import all agent configurations from separate files
const { AGENTS_CONFIG, FRAMEWORK_TEMPLATES } = require("./index");

// Default options configuration - kept in main file for convenience
const DEFAULT_OPTIONS = {
  enableSelfReflection: true,
  enableProgressUpdates: true,
  outputFormat: "playwright",
  framework: "playwright",
};

// Helper functions to access config in a clean way
class ConfigHelper {
  static getAgent(agentName) {
    return AGENTS_CONFIG.find((agent) => agent.name === agentName);
  }

  static getSystemPrompt(agentName) {
    const agent = this.getAgent(agentName);
    return agent ? agent.systemPrompt : null;
  }

  static getTemperature(agentName) {
    const agent = this.getAgent(agentName);
    return agent ? agent.temperature : 0.1;
  }

  static buildPrompt(agentName, ...args) {
    const agent = this.getAgent(agentName);
    if (agent && agent.buildPrompt) {
      return agent.buildPrompt(...args);
    }
    throw new Error(
      `Agent ${agentName} not found or doesn't have buildPrompt function`
    );
  }

  static getAgentsByCategory(category) {
    return AGENTS_CONFIG.filter((agent) => agent.category === category);
  }

  static getFrameworkTemplate(framework) {
    return FRAMEWORK_TEMPLATES[framework] || FRAMEWORK_TEMPLATES.playwright;
  }

  static getAllAgentNames() {
    return AGENTS_CONFIG.map((agent) => agent.name);
  }

  // PERBAIKAN: Method untuk mengecek agent availability
  static hasAgent(agentName) {
    debugger;

    return AGENTS_CONFIG.some((agent) => agent.name === agentName);
  }

  static debugAgentConfig() {
    return AGENTS_CONFIG.map((agent) => ({
      name: agent.name,
      hasBuildPrompt: typeof agent.buildPrompt === "function",
      category: agent.category,
    }));
  }
}

module.exports = {
  AGENTS_CONFIG,
  FRAMEWORK_TEMPLATES,
  DEFAULT_OPTIONS,
  ConfigHelper,
};
