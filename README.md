# Agentic Testing

🤖 **Unified AI-Powered Test Generation Framework** - Centralized testing system with multiple LLM providers for automated code generation!

## 🎯 **What is this?**

Agentic Testing is a unified framework that uses multiple AI providers to:

- **Generate modern Playwright test code** with anti-narrative prompts
- **Support multiple LLM providers** (Bedrock Claude 4, Ollama, Groq, OpenAI, Anthropic)
- **Provide health checks** and cost monitoring for all providers
- **Centralize all testing** through a single unified test runner

## 🚀 **Key Features**

### **� Modular Provider System**

- **BaseProvider** → Abstract base with health checks
- **BedrockProvider** → AWS Bedrock Claude 4 (optimized)
- **OllamaProvider** → Local Ollama models
- **GroqProvider, OpenAIProvider, AnthropicProvider** → Cloud APIs

### **🤖 Anti-Narrative Code Generation**

- Direct code output (no explanations or narrative)
- Custom parsers for clean code extraction
- Optimized prompts for pure code generation

### **� Unified Test Runner**

- Single entry point for all testing operations
- Clean parameterization system
- Standardized output format
- Reusable utilities for UI and CLI

### **🏗️ Clean Architecture**

- Centralized provider management
- Health checks and cost monitoring
- Production-ready modular design

## 📚 **Documentation**

| Document                                                                        | Purpose                                     | Target Audience |
| ------------------------------------------------------------------------------- | ------------------------------------------- | --------------- |
| **[🎯 Unified Test Runner](server/dev-tools/)**                                 | Main orchestrator and all testing utilities | **All users**   |
| **[🏗️ Architecture Success](server/dev-tools/unified-architecture-success.js)** | Complete technical overview                 | **Developers**  |
| **[� Documentation](server/dev-tools/README.js)**                               | Full framework documentation                | **All users**   |

## 🚀 **Quick Start**

```bash
# 1. Clone & install
git clone <repository>
cd agentic-testing/server
npm install

# 2. Health check all providers
node dev-tools/unified-test-runner.js --health-check --all-providers

# 3. Run E2E test with Bedrock Claude 4
node dev-tools/unified-test-runner.js --e2e --bedrock-claude4

# 4. Clean all test data
node dev-tools/unified-test-runner.js --clean-all
```

➡️ **For complete documentation, run: `node server/dev-tools/README.js`**

## 🎯 **Use Cases**

**Perfect for:**

- ✅ Multi-provider LLM testing
- ✅ Automated Playwright test generation
- ✅ AI code generation with cost monitoring
- ✅ Provider health checks and monitoring
- ✅ Clean, anti-narrative code output

**Great for developers who:**

- 🚀 Want centralized AI testing
- 🔍 Need multiple LLM provider support
- 📊 Love cost and token monitoring
- 🎯 Build production-ready test automation
- 📦 Seek modular, reusable architecture

## 🌟 **What's Special**

### **Unified Test Runner**

```bash
# Health check all providers
node dev-tools/unified-test-runner.js --health-check --all-providers

# E2E test with specific provider
node dev-tools/unified-test-runner.js --e2e --bedrock-claude4

# Clean all test data
node dev-tools/unified-test-runner.js --clean-all
```

### **Anti-Narrative Code Generation**

```javascript
// ✅ Generated code is clean and direct (no explanations)
const dobInput = page.locator("#dob");
await dobInput.fill("1990-01-01");
await expect(page.locator(".error")).toBeVisible();
```

### **Modular Provider System**

```javascript
// ✅ All providers use standardized interface
const provider = providerManager.getProvider("bedrock-claude4");
const result = await provider.generateCode(prompt);
```

## 📊 **Current Status**

- ✅ **Unified Architecture**: All testing centralized in unified-test-runner
- ✅ **Modular Providers**: Bedrock, Ollama, Groq, OpenAI, Anthropic support
- ✅ **Anti-Narrative Prompts**: Direct code output (no explanations)
- ✅ **Health Checks**: Provider availability and cost monitoring
- ✅ **Clean Codebase**: All legacy files cleaned up
- ✅ **Production Ready**: Standardized interfaces and error handling

## 🤝 **Contributing**

1. Use `unified-test-runner.js` for all testing operations
2. Follow modular provider pattern for new providers
3. Maintain anti-narrative prompt optimization
4. Add health checks for new integrations
5. Keep architecture centralized and clean

## 📝 **License**

MIT License - feel free to use and modify.

---

**📖 Ready to start? Run: `node server/dev-tools/README.js` for complete documentation!**

**Last Updated**: July 2, 2025 | **Version**: 3.0.0 (Unified Architecture)
