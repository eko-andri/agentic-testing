# Agentic Testing

🤖 **Live UI Analysis & Automated Test Generation** - Automated system for analyzing web applications and generating comprehensive test suites!

## 🎯 **What is this?**

Agentic Testing is a smart tool that uses AI agents to:

- **Analyze web forms** in real-time or from HTML files
- **Generate modern Playwright test code** that's ready to use
- **Detect validation rules** and business logic automatically
- **Create comprehensive test scenarios** that are error-free

## 🚀 **Key Features**

### **🔄 Dual Analysis Methods**

- **Live UI Analysis** → Puppeteer analyzes running applications in real-time
- **File-based Analysis** → LLM analyzes static HTML files

### **🤖 Smart Test Generation**

- Modern Playwright syntax (page.locator, fill, expect)
- Error-free code generation with optimized prompts
- Multiple test scenarios: validation, edge cases, business rules

### **🎨 Beautiful User Interface**

- Toggle interface for choosing analysis method
- Real-time progress indicators
- Clear status messages and error handling

### **🏗️ Clean Architecture**

- Modular design with separation of concerns
- Event-driven agent orchestration
- Future-proof for advanced features

## 📚 **Documentation**

| Document                                       | Purpose                              | Target Audience  |
| ---------------------------------------------- | ------------------------------------ | ---------------- |
| **[📖 Setup Guide](docs/SETUP.md)**            | Installation, usage, testing         | **All users**    |
| **[🏗️ Architecture](docs/ARCHITECTURE.md)**    | Technical details, advanced features | **Developers**   |
| **[🛠️ Dev Tools](server/dev-tools/HOW_TO.md)** | Development scripts, debugging       | **Contributors** |

## 🚀 **Quick Start**

```bash
# 1. Clone & install
git clone <repository>
cd agentic-testing/server
npm install

# 2. Start server
npm run dev

# 3. Open browser
open http://localhost:3333

# 4. Generate tests!
```

➡️ **For detailed setup instructions, see [Setup Guide](docs/SETUP.md)**

## 🎯 **Use Cases**

**Perfect for:**

- ✅ Form validation testing
- ✅ E2E test generation
- ✅ Dynamic web application analysis
- ✅ CI/CD pipeline integration
- ✅ Test coverage automation

**Great for developers who:**

- 🚀 Want automated test generation
- 🔍 Need deep form analysis
- 📊 Love smart test recommendations
- 🎯 Build user journey testing
- 📦 Seek easy integration

## 🌟 **What's Special**

### **Analysis Method Toggle**

```
🌐 Live UI Analysis (Recommended)
  ✅ Real-time analysis
  ✅ Dynamic behavior detection
  ⚠️ Requires running app

📁 File-based Analysis (Legacy)
  ✅ Fast static analysis
  ✅ Offline capable
  ❌ Limited to static HTML
```

### **Modern Code Generation**

```javascript
// ✅ Generated code uses modern patterns
const dobInput = page.locator("#dob");
await dobInput.fill("1990-01-01");
await expect(page.locator(".error")).toBeVisible();
```

## 📊 **Current Status**

- ✅ **Core Features**: Analysis methods, test generation, UI toggle
- ✅ **Code Quality**: Modern Playwright, error-free generation
- ✅ **Architecture**: Clean, modular, extensible
- ✅ **Documentation**: Structured, comprehensive, up-to-date
- 🔄 **Advanced Features**: Event-driven agents, complex UI analysis

## 🤝 **Contributing**

1. Read [Architecture Guide](docs/ARCHITECTURE.md) for technical details
2. Check [Setup Guide](docs/SETUP.md) for development workflow
3. Use [Dev Tools](server/dev-tools/HOW_TO.md) for testing
4. Follow clean architecture patterns
5. Submit PRs with tests

## 📝 **License**

MIT License - feel free to use and modify.

---

**📖 Ready to start? Go to [Setup Guide](docs/SETUP.md) for detailed instructions!**

**Last Updated**: June 30, 2025 | **Version**: 2.0.0
