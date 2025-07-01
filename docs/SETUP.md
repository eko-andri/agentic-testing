# Setup Guide - Agentic Testing

Complete guide for installing, using, and running tests with Agentic Testing.

## 📋 **Prerequisites**

- **Node.js** v14+ (recommended v18+)
- **npm** or **yarn**
- **LLM Provider**: Ollama with models like qwen2.5-coder:7b
- **Browser**: Chrome/Chromium for Puppeteer

## ⚡ **Installation**

### **1. Clone Repository**

```bash
git clone <repository-url>
cd agentic-testing
```

### **2. Install Dependencies**

```bash
cd server
npm install
```

### **3. Setup LLM Provider**

#### **Option A: Ollama (Recommended)**

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull model
ollama pull qwen2.5-coder:7b

# Start Ollama service
ollama serve
```

#### **Option B: AWS Bedrock**

```bash
# Set environment variables
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
export AWS_REGION=us-east-1
```

### **4. Environment Configuration**

```bash
# Create .env file (optional)
LLM_PROVIDER=ollama
LLM_MODEL=qwen2.5-coder:7b
PORT=3333
```

## 🚀 **How to Use**

### **1. Start the Server**

```bash
cd server
npm run dev        # Development mode (auto-reload)
npm start          # Production mode
```

The server will run on `http://localhost:3333`

### **2. Open Web Interface**

```bash
open http://localhost:3333
```

### **3. Generate Tests**

#### **Step-by-step Process:**

1. **Fill Form Description**

   ```
   Example: "User registration form with email, password, and age validation"
   ```

2. **Fill Acceptance Criteria**

   ```
   Example:
   - Email must be valid format
   - Password minimum 8 characters
   - Age must be 18 or older
   - Form shows validation errors
   ```

3. **Choose Analysis Method**

   **🌐 Live UI Analysis (Recommended):**

   - Enter application URL (e.g., `http://localhost:5500/policy-form.html`)
   - Application must be running and accessible
   - Best for dynamic forms with JavaScript validation

   **📁 File-based Analysis (Legacy):**

   - Upload HTML file atau paste HTML content
   - Good for static forms without dynamic behavior

4. **Submit & Wait**
   - Click "Generate Tests" button
   - Wait for analysis and generation process
   - Download generated Playwright test file

### **4. Run Generated Tests**

```bash
# Install Playwright (if not installed)
npm install -g @playwright/test

# Run generated test
npx playwright test generated-test.spec.js

# Run with UI mode
npx playwright test --ui

# Run with debug mode
npx playwright test --debug
```

## 🎯 **Analysis Methods Comparison**

### **🌐 Live UI Analysis**

**When to Use:**

- Modern web applications (React, Vue, Angular)
- Forms with JavaScript validation
- Dynamic content or conditional fields
- SPAs with client-side routing

**How it Works:**

1. Puppeteer opens the specified URL
2. Extracts DOM structure and form elements
3. Captures dynamic behaviors and validation rules
4. No LLM needed for basic analysis (faster)

**Example:**

```javascript
// Generated code captures dynamic behavior
await page.locator("#email").fill("invalid-email");
await page.locator("#submit").click();
await expect(page.locator(".error-message")).toBeVisible();
```

### **📁 File-based Analysis**

**When to Use:**

- Static HTML forms
- Simple forms without JavaScript
- Development/testing scenarios
- Offline analysis

**How it Works:**

1. LLM analyzes HTML structure
2. Identifies form elements and attributes
3. Infers validation rules from HTML attributes
4. Generates tests based on static analysis

**Example:**

```html
<!-- Input HTML -->
<input type="email" required minlength="5" id="email" />

<!-- Generated test understands requirements -->
await page.locator('#email').fill('abc'); // Too short await
expect(page.locator('.error')).toBeVisible();
```

## 🧪 **Testing Your Setup**

### **1. Basic Functionality Test**

```bash
cd server/dev-tools
node test-analysis-method-toggle.js
```

### **2. Live UI Demo**

```bash
# Start a simple HTTP server for demo
cd /path/to/agentic-testing
python -m http.server 8000  # or use Live Server extension

# Run live UI analysis demo
cd server/dev-tools
node test-live-ui-demo.js
```

### **3. Compare Both Methods**

```bash
cd server/dev-tools
node test-orchestrator-integration.js
```

### **4. Test Form Examples**

Demo forms tersedia di project root:

- `policy-form.html` - Insurance policy form dengan age validation
- `cv-builder.html` - CV builder form dengan multiple fields

## 🛠️ **Advanced Configuration**

### **Custom LLM Models**

```bash
# Use different Ollama model
export LLM_MODEL=codellama:7b

# Use different provider
export LLM_PROVIDER=bedrock
export LLM_MODEL=anthropic.claude-v2
```

### **Puppeteer Configuration**

```javascript
// In server/liveUIAnalyzer.js, modify browser options:
const browser = await puppeteer.launch({
  headless: false, // Show browser for debugging
  devtools: true, // Open DevTools
  slowMo: 100, // Slow down actions
});
```

### **Test Generation Options**

```javascript
// In orchestrator configuration
const orchestrator = new Orchestrator({
  analysisMethod: "live-ui",
  framework: "playwright", // or "cypress"
  generateMultipleScenarios: true,
  includeNegativeTests: true,
});
```

## 🚨 **Troubleshooting**

### **Common Issues & Solutions**

#### **"Cannot connect to LLM"**

```bash
# Check if Ollama is running
ollama ps

# Restart Ollama
ollama serve

# Test connection
curl http://localhost:11434/api/tags
```

#### **"Puppeteer cannot launch browser"**

```bash
# Install required dependencies (Linux)
sudo apt-get install -y chromium-browser

# Or install Chromium via Puppeteer
npx puppeteer browsers install chrome
```

#### **"Analysis failed"**

- **For Live UI**: Ensure application is running and accessible
- **For File-based**: Check HTML syntax and structure
- **General**: Check network connectivity and model availability

#### **"Generated test fails"**

- Review element selectors in generated code
- Check timing issues (add waits if needed)
- Verify application state during test execution

### **Debug Mode**

```bash
# Enable detailed logging
DEBUG=1 npm run dev

# Run with verbose output
npm run dev -- --verbose
```

### **Log Files**

- Server logs: `server/logs/`
- Analysis reports: `server/reports/`
- Screenshots: `server/screenshots/`

## 📊 **Performance Tips**

### **For Better Analysis**

1. **Use stable selectors** - IDs are better than classes
2. **Ensure clean HTML** - Well-formed markup works better
3. **Test with realistic data** - Use actual user scenarios
4. **Consider loading times** - Applications need time to load

### **For Generated Tests**

1. **Review before running** - Generated tests may need customization
2. **Add setup/teardown** - Include login, logout, cleanup
3. **Use page objects** - For complex applications
4. **Integrate with CI/CD** - Automate test execution

## 🎯 **Best Practices**

### **Form Analysis**

- Start with simple forms before complex ones
- Use Live UI analysis for dynamic forms
- Provide clear acceptance criteria
- Test with different data scenarios

### **Test Generation**

- Generate multiple test files for different scenarios
- Include both positive and negative test cases
- Add meaningful test descriptions
- Use proper assertions

### **Development Workflow**

1. Design forms with testability in mind
2. Use semantic HTML attributes
3. Add proper ARIA labels
4. Include validation feedback elements

## 🔄 **Integration with CI/CD**

### **GitHub Actions Example**

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install

      - name: Run generated tests
        run: npx playwright test
```

### **Jenkins Pipeline**

```groovy
pipeline {
    agent any
    stages {
        stage('Install') {
            steps {
                sh 'npm ci'
                sh 'npx playwright install'
            }
        }
        stage('Test') {
            steps {
                sh 'npx playwright test'
            }
            post {
                always {
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'playwright-report',
                        reportFiles: 'index.html',
                        reportName: 'Playwright Report'
                    ])
                }
            }
        }
    }
}
```

## 📈 **What's Next?**

After successfully setting up:

1. **Explore Advanced Features** - Check [Architecture Guide](ARCHITECTURE.md)
2. **Contribute to Development** - See [Dev Tools Guide](../server/dev-tools/HOW_TO.md)
3. **Customize for Your Needs** - Modify prompts and analysis logic
4. **Share Your Experience** - Contribute back to the project

---

**Need help? Check the [Architecture Guide](ARCHITECTURE.md) for technical details or browse the [Dev Tools](../server/dev-tools/HOW_TO.md) for debugging options.**
