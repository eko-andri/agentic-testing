# Provider System Architecture - Scalable & Organized

## 🏗️ Arsitektur Overview

Sistem provider LLM telah direfactor menjadi arsitektur yang sangat scalable dan organized dimana:

1. **callLLM** di `utils.js` hanya sebagai **dispatcher sederhana**
2. **Setiap provider** punya **class dan file terpisah** dengan parser sendiri
3. **ProviderManager** menangani factory, fallback, dan health check
4. **Mudah menambah provider baru** tanpa mengubah kode existing

## 📁 Struktur File

```
server/
├── utils.js                    # Main dispatcher (callLLM)
├── providers/
│   ├── index.js               # ProviderManager (factory & fallback)
│   ├── BaseProvider.js        # Abstract base class
│   ├── GroqProvider.js        # Groq Cloud implementation
│   ├── OpenAIProvider.js      # OpenAI implementation
│   ├── AnthropicProvider.js   # Claude implementation
│   ├── OllamaProvider.js      # Local Ollama implementation
│   └── BedrockProvider.js     # AWS Bedrock implementation
└── dev-tools/
    └── test-providers.js      # Provider testing utility
```

## 🎯 Key Benefits

### 1. **Scalability**

- Setiap provider isolated dalam class sendiri
- Mudah add provider baru (Google AI, Hugging Face, etc.)
- No impact ke existing code saat add provider

### 2. **Organized**

- Clear separation of concerns
- Each provider handles own parsing logic
- Consistent interface via BaseProvider

### 3. **Robust**

- Automatic fallback handling
- Health checks dan retry logic
- Provider-specific error handling

### 4. **Flexible**

- Easy switching between providers
- Environment-based configuration
- Model-specific optimizations

## 🔧 Usage

### Basic Usage (Simple Dispatcher)

```javascript
const { callLLM } = require("./utils.js");

// Auto menggunakan provider yang tersedia
const result = await callLLM({
  prompt: "Generate Playwright test",
  system: "You are a test generator",
  temperature: 0.3,
});
```

### Provider-Specific Usage

```javascript
// Force specific provider
const result = await callLLM({
  prompt: "Test prompt",
  provider: "anthropic", // atau 'groq', 'openai', 'bedrock', 'ollama'
  model: "claude-3-haiku",
});
```

### Provider Management

```javascript
const {
  initializeProviders,
  switchProvider,
  getAvailableProviders,
  testProvider,
} = require("./utils.js");

// Initialize semua provider
await initializeProviders();

// Lihat provider tersedia
const providers = getAvailableProviders();

// Switch provider
await switchProvider("anthropic");

// Test provider health
const health = await testProvider("groq");
```

## 📊 Provider-Specific Features

### Ollama Provider

- **Performance metrics**: tokens/sec, response time
- **Model-specific optimizations**: context size, timeout
- **Reasoning detection**: Qwen model patterns
- **Memory management**: untuk large models

### Anthropic Provider

- **Claude-specific formatting**: system prompts, message structure
- **Usage tracking**: token consumption
- **Stop reason analysis**: completion analysis
- **Version management**: anthropic-version header

### Groq Provider

- **High-speed inference**: optimized for Groq hardware
- **Rate limit handling**: 429 errors
- **Model routing**: different models per use case

### Bedrock Provider

- **AWS integration**: credentials, regions
- **Model ID resolution**: friendly names to AWS IDs
- **Error mapping**: AWS-specific error handling
- **Multi-region support**: fallback regions

### OpenAI Provider

- **Multiple model support**: GPT-4, GPT-3.5, etc.
- **Streaming support**: untuk real-time responses
- **Function calling**: tools dan functions
- **Image support**: GPT-4 Vision

## 🔄 Fallback Strategy

1. **Primary Provider** (dari ENV): Groq, OpenAI, Anthropic, Bedrock
2. **Secondary Providers**: Other available cloud providers
3. **Fallback**: Ollama (local, always available)
4. **Auto-setup**: Prompt user untuk setup Ollama jika perlu

## 🧪 Testing

### Test All Providers

```bash
node dev-tools/test-providers.js
```

### Test Specific Functionality

```javascript
// Test parsing capabilities
const result = await callLLM({
  prompt: 'Return JSON: {"test": true}',
  system: "Return only valid JSON",
});

// Test Playwright generation
const playwright = await callLLM({
  prompt: "Generate login test",
  system: "Generate @playwright/test TypeScript code",
});
```

## 🎨 Adding New Provider

### 1. Create Provider Class

```javascript
// providers/NewProvider.js
const BaseProvider = require("./BaseProvider");

class NewProvider extends BaseProvider {
  constructor() {
    super({
      name: "New Provider",
      defaultModel: "new-model-v1",
      requiresApiKey: true,
    });
  }

  async isAvailable() {
    return !!process.env.NEW_PROVIDER_API_KEY;
  }

  async call({ prompt, system, temperature, model }) {
    // Provider-specific implementation
    const response = await this._callAPI({
      prompt,
      system,
      temperature,
      model,
    });
    return this._parseResponse(response);
  }

  _parseResponse(response) {
    // Provider-specific parsing logic
    return response.data.content;
  }
}

module.exports = NewProvider;
```

### 2. Register di ProviderManager

```javascript
// providers/index.js
const NewProvider = require("./NewProvider");

const providerClasses = {
  // ...existing providers...
  newprovider: NewProvider,
};
```

### 3. Environment Configuration

```bash
# .env
NEW_PROVIDER_API_KEY=your_api_key
NEW_PROVIDER_MODEL=new-model-v1
```

## 🌟 Best Practices

### 1. **Error Handling**

- Setiap provider handle error secara spesifik
- Meaningful error messages untuk debugging
- Graceful fallback tanpa crash

### 2. **Performance**

- Model-specific timeouts (large models = longer timeout)
- Connection pooling untuk high-frequency calls
- Caching untuk health checks

### 3. **Security**

- API keys di environment variables
- No hardcoded credentials
- Secure credential handling untuk AWS

### 4. **Monitoring**

- Performance metrics logging
- Health check scheduling
- Usage tracking per provider

## 🔧 Configuration Examples

### Multi-Provider Setup

```bash
# .env - Multiple providers configured
LLM_PROVIDER=groq                           # Primary
GROQ_API_KEY=gsk_...
GROQ_MODEL=qwen3:30b

OPENAI_API_KEY=sk-...                       # Fallback 1
OPENAI_MODEL=gpt-4o-mini

ANTHROPIC_API_KEY=sk-ant-...                # Fallback 2
ANTHROPIC_MODEL=claude-3-haiku-20240307

AWS_ACCESS_KEY_ID=AKIA...                   # Fallback 3
AWS_SECRET_ACCESS_KEY=...
BEDROCK_MODEL=claude-3-haiku

OLLAMA_MODEL=qwen3:8b                       # Final fallback
```

### Cost Optimization

```bash
# Untuk development - gunakan model yang lebih murah
LLM_PROVIDER=anthropic
ANTHROPIC_MODEL=claude-3-haiku-20240307     # Cheapest Claude

# Untuk production - gunakan model terbaik
LLM_PROVIDER=anthropic
ANTHROPIC_MODEL=claude-3-5-sonnet-20240620 # Best performance
```

## 📈 Metrics & Monitoring

### Provider Health Dashboard

```javascript
const providers = getAvailableProviders();
for (const provider of providers) {
  const health = await testProvider(provider.name);
  console.log(`${provider.name}: ${health.success ? "✅" : "❌"}`);
}
```

### Performance Tracking

- Response time per provider
- Token usage dan cost estimation
- Success/failure rates
- Fallback frequency

## 🎯 Integration dengan Pipeline

Semua agent dalam pipeline (TestAnalysisAgent, Orchestrator, etc.) otomatis menggunakan provider system:

```javascript
// orchestrator.js
const { callLLM } = require("./utils.js");

// Otomatis pakai provider terbaik yang tersedia
const testCode = await callLLM({
  prompt: testGenerationPrompt,
  system: playwrightSystemPrompt,
});
```

## 🚀 Future Enhancements

1. **Provider Load Balancing**: Distribute requests across providers
2. **Cost Optimization**: Auto-select cheapest provider untuk task
3. **Model Routing**: Different models untuk different types of tasks
4. **Streaming Support**: Real-time responses untuk interactive mode
5. **Cache Layer**: Cache responses untuk identical prompts
6. **Analytics Dashboard**: Visual monitoring untuk provider performance

---

✅ **Status**: Fully implemented and tested  
🎯 **Ready for**: Production usage dengan multi-provider fallback  
🔧 **Maintainable**: Easy to extend dengan provider baru
