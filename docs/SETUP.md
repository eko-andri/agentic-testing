# Setup Guide - Agentic Testing Framework

Complete installation and setup guide for the unified agentic testing framework.

## 🚀 **Quick Start**

```bash
# 1. Clone the repository
git clone <repository-url>
cd agentic-testing

# 2. Install dependencies
cd server
npm install

# 3. Setup environment variables
cp .env.example .env
# Edit .env with your API keys

# 4. Test the installation
node dev-tools/unified-test-runner.js --health-check --all-providers
```

## ⚙️ **Detailed Setup**

### **1. Prerequisites**

- **Node.js**: Version 16+ recommended
- **npm**: Version 8+ (comes with Node.js)
- **Git**: For cloning the repository

Optional:

- **Ollama**: For local LLM models (if using OllamaProvider)
- **Playwright**: Will be installed automatically

### **2. Installation**

```bash
# Clone the repository
git clone <repository-url>
cd agentic-testing

# Navigate to server directory
cd server

# Install all dependencies
npm install

# Verify installation
node --version  # Should show Node.js version
npm list        # Should show installed packages
```

### **3. Environment Configuration**

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` file with your API keys:

```bash
# AWS Bedrock (Claude 4 - Recommended)
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Groq Cloud (Fast inference)
GROQ_API_KEY=your_groq_api_key

# OpenAI (GPT models)
OPENAI_API_KEY=your_openai_api_key

# Anthropic (Claude models)
ANTHROPIC_API_KEY=your_anthropic_api_key

# Ollama (Local models - optional)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:8b
```

**Provider Setup Priority:**

1. **AWS Bedrock** (Recommended): Best performance, cost-effective
2. **Ollama**: Free local models, good for development
3. **Groq**: Fast inference, good for testing
4. **OpenAI/Anthropic**: Backup options

### **4. Provider-Specific Setup**

#### **AWS Bedrock Setup**

1. **Create AWS Account** and setup credentials
2. **Enable Bedrock Access** in your AWS region
3. **Request Model Access** for Claude 4:

   - Go to AWS Bedrock console
   - Request access to Anthropic Claude models
   - Wait for approval (usually instant)

4. **Create IAM User** with Bedrock permissions:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "bedrock:InvokeModel",
           "bedrock:InvokeModelWithResponseStream"
         ],
         "Resource": "*"
       }
     ]
   }
   ```

#### **Ollama Setup (Local Models)**

1. **Install Ollama**:

   ```bash
   # macOS
   brew install ollama

   # Or download from https://ollama.ai
   ```

2. **Start Ollama service**:

   ```bash
   ollama serve
   ```

3. **Download models**:

   ```bash
   # Qwen 3 (8B) - Recommended
   ollama pull qwen3:8b

   # Or other models
   ollama pull llama3:8b
   ollama pull codellama:7b
   ```

#### **Cloud Provider Setup**

For **Groq**, **OpenAI**, or **Anthropic**:

1. **Create account** on respective platform
2. **Generate API key** from dashboard
3. **Add to .env file** with appropriate variable name

### **5. Verification**

Test your setup with health checks:

```bash
# Check all providers
node dev-tools/unified-test-runner.js --health-check --all-providers

# Check specific provider
node dev-tools/unified-test-runner.js --health-check --bedrock
node dev-tools/unified-test-runner.js --health-check --ollama
```

Expected output:

```
🏥 Health Check Summary:
   ✅ Health-bedrock
   ✅ Health-ollama
   ⚠️  Health-groq (not available)
```

## 🎯 **Usage Examples**

### **Basic Operations**

```bash
# Complete documentation
node dev-tools/README.js

# Health check all providers
node dev-tools/unified-test-runner.js --health-check --all-providers

# E2E test with Bedrock Claude 4
node dev-tools/unified-test-runner.js --e2e --bedrock-claude4

# E2E test with Ollama Qwen
node dev-tools/unified-test-runner.js --e2e --ollama-qwen

# Clean all test data
node dev-tools/unified-test-runner.js --clean-all
```

### **Advanced Usage**

```bash
# Test specific provider
node dev-tools/unified-test-runner.js --test-provider bedrock

# Custom model
node dev-tools/unified-test-runner.js --e2e --bedrock --model claude-3-5-sonnet

# Multiple tests
node dev-tools/unified-test-runner.js --e2e --all-providers
```

## 🔧 **Configuration Options**

You can customize the framework behavior by editing configuration files:

### **Provider Configuration**

Edit `server/providers/index.js` to modify provider settings:

```javascript
// Example: Modify timeout for all providers
const defaultConfig = {
  timeout: 180000, // 3 minutes
  maxTokens: 4000,
  temperature: 0.3,
};
```

### **Model Configuration**

Edit individual provider files to change default models:

```javascript
// In BedrockProvider.js
constructor(config = {}) {
    super({
        name: "AWS Bedrock",
        defaultModel: "apac.anthropic.claude-sonnet-4-20250514-v1:0",
        // ... other config
    });
}
```

### **Prompt Configuration**

Modify anti-narrative prompts in provider files:

```javascript
// In BedrockProvider.js
const ANTI_NARRATIVE_SYSTEM = `
You are a code generator. Output ONLY the requested code.
NO explanations, NO comments, NO narrative text.
Just pure, clean, functional code.
`;
```

## 📊 **Monitoring & Debugging**

### **Logging**

The framework provides detailed logging:

```bash
# Enable debug mode
DEBUG=* node dev-tools/unified-test-runner.js --health-check

# Provider-specific logging
DEBUG=provider:* node dev-tools/unified-test-runner.js --e2e --bedrock
```

### **Test Results**

All test results are saved to:

```
server/test-results/unified-test-results.json
```

View results:

```bash
cat server/test-results/unified-test-results.json | jq
```

### **Cost Monitoring**

Monitor LLM usage costs:

```bash
# Results include cost information
{
  "provider": "bedrock",
  "tokens": 265,
  "cost": 0.001767,
  "model": "claude-4"
}
```

## 🐛 **Troubleshooting**

### **Common Issues**

**1. "Provider not available" error:**

```bash
# Check API keys in .env
cat .env | grep API_KEY

# Test specific provider
node dev-tools/unified-test-runner.js --health-check --bedrock
```

**2. "Connection timeout" error:**

```bash
# Increase timeout in provider config
# Or check network connectivity
curl -I https://api.groq.com/
```

**3. "Model not found" error:**

```bash
# For Bedrock: Check model access in AWS console
# For Ollama: Pull the model
ollama pull qwen3:8b
```

**4. "Permission denied" errors:**

```bash
# Check AWS IAM permissions
# Or verify API key has correct scopes
```

### **Debug Mode**

Enable detailed debugging:

```bash
# Full debug output
DEBUG=* node dev-tools/unified-test-runner.js --health-check

# Provider-only debug
DEBUG=provider:* node dev-tools/unified-test-runner.js --e2e --bedrock

# Network debug
DEBUG=http:* node dev-tools/unified-test-runner.js --health-check
```

### **Reset Everything**

If you need to start fresh:

```bash
# Clean all test data
node dev-tools/unified-test-runner.js --clean-all

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Reset configuration
cp .env.example .env
# Re-enter your API keys
```

## 🎓 **Next Steps**

After successful setup:

1. **Read the Architecture Guide**: `docs/ARCHITECTURE.md`
2. **Run Complete Documentation**: `node dev-tools/README.js`
3. **Try E2E Testing**: `node dev-tools/unified-test-runner.js --e2e --bedrock-claude4`
4. **Explore Provider System**: Look at `server/providers/` directory
5. **Check Cost Monitoring**: Review test results for token usage

## 📞 **Support**

- **Documentation**: Run `node dev-tools/README.js`
- **Architecture**: Read `docs/ARCHITECTURE.md`
- **Issues**: Check provider health with `--health-check`
- **Debug**: Use `DEBUG=*` environment variable

## ✅ **Verification Checklist**

Before using the framework, verify:

- [ ] Node.js 16+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] Environment variables configured (`.env` file)
- [ ] At least one provider working (health check passes)
- [ ] Can run basic commands without errors
- [ ] Test results directory created and writable

**Success indicators:**

```bash
node dev-tools/unified-test-runner.js --health-check --all-providers
# Should show ✅ for at least one provider
```

---

**Ready to start? Run the health check and begin testing!**

```bash
node dev-tools/unified-test-runner.js --health-check --all-providers
```
