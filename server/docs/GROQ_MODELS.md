# Groq Available Models Reference

This file contains all available models on Groq platform with their specifications and recommended use cases.

## Text Generation Models

### Alibaba Qwen Models

#### qwen/qwen3-32b ⭐ (Current Default)

- **Owner**: Alibaba Cloud
- **Context Window**: 131,072 tokens (very large!)
- **Max Completion**: 40,960 tokens (excellent!)
- **Use Cases**: Complex reasoning, large context processing, high-quality outputs
- **Performance**: Extremely fast (4.5s for 9K+ chars)
- **Copy to .env**: `GROQ_MODEL=qwen/qwen3-32b`

#### qwen-qwq-32b

- **Owner**: Alibaba Cloud
- **Context Window**: 131,072 tokens
- **Max Completion**: 131,072 tokens (maximum!)
- **Use Cases**: Question-answering, reasoning, analysis
- **Copy to .env**: `GROQ_MODEL=qwen-qwq-32b`

### Meta LLaMA Models

#### llama3-8b-8192

- **Owner**: Meta
- **Context Window**: 8,192 tokens
- **Max Completion**: 8,192 tokens
- **Use Cases**: General tasks, fast inference, lightweight applications
- **Copy to .env**: `GROQ_MODEL=llama3-8b-8192`

#### llama3-70b-8192

- **Owner**: Meta
- **Context Window**: 8,192 tokens
- **Max Completion**: 8,192 tokens
- **Use Cases**: Complex reasoning, high-quality outputs, detailed analysis
- **Copy to .env**: `GROQ_MODEL=llama3-70b-8192`

#### llama-3.1-8b-instant

- **Owner**: Meta
- **Context Window**: 131,072 tokens (very large!)
- **Max Completion**: Large
- **Use Cases**: Long document processing, extensive context handling
- **Copy to .env**: `GROQ_MODEL=llama-3.1-8b-instant`

#### llama-3.3-70b-versatile (Current Default)

- **Owner**: Meta
- **Context Window**: Large
- **Max Completion**: High
- **Use Cases**: Versatile tasks, high performance, production use
- **Copy to .env**: `GROQ_MODEL=llama-3.3-70b-versatile`

### Google Models

#### gemma2-9b-it

- **Owner**: Google
- **Context Window**: 8,192 tokens
- **Max Completion**: 8,192 tokens
- **Use Cases**: Instruction following, chat applications, Google-optimized tasks
- **Copy to .env**: `GROQ_MODEL=gemma2-9b-it`

### Security Models

#### llama-guard-3-8b

- **Owner**: Meta
- **Context Window**: 8,192 tokens
- **Use Cases**: Content moderation, safety checks, filtering
- **Copy to .env**: `GROQ_MODEL=llama-guard-3-8b`

## Audio Models (Whisper)

### OpenAI Whisper Models

#### whisper-large-v3-turbo

- **Owner**: OpenAI
- **Context Window**: 448 tokens
- **Use Cases**: Fast speech-to-text, audio transcription (turbo speed)
- **Copy to .env**: `GROQ_MODEL=whisper-large-v3-turbo`

#### whisper-large-v3

- **Owner**: OpenAI
- **Context Window**: 448 tokens
- **Use Cases**: High-quality speech-to-text, audio transcription
- **Copy to .env**: `GROQ_MODEL=whisper-large-v3`

#### distil-whisper-large-v3-en

- **Owner**: Hugging Face
- **Context Window**: 448 tokens
- **Use Cases**: English-only transcription, optimized performance
- **Copy to .env**: `GROQ_MODEL=distil-whisper-large-v3-en`

## Model Recommendations by Task

### For Agentic Testing (Test Generation)

1. **qwen/qwen3-32b** (Current default) - Fastest performance, large context
2. **llama-3.3-70b-versatile** - Best overall quality
3. **llama3-70b-8192** - Reliable, good balance

### For Form Analysis (JSON Parsing)

1. **qwen/qwen3-32b** - Fast and large context
2. **gemma2-9b-it** - Good at instruction following
3. **llama-3.3-70b-versatile** - Reliable structured output

### For Code Generation

1. **qwen/qwen3-32b** - Very fast, large context for complex code
2. **llama-3.3-70b-versatile** - Best code quality
3. **llama3-70b-8192** - Good code understanding

### For Quick Testing/Development

1. **llama3-8b-8192** - Fastest response
2. **gemma2-9b-it** - Good for simple tasks
3. **llama-3.1-8b-instant** - Good balance

## Usage Examples

### Test Different Models for Performance

```bash
# Test with fast model
GROQ_MODEL=llama3-8b-8192 node dev-tools/unified-test-runner.js --health-check --groq

# Test with high-quality model
GROQ_MODEL=llama-3.3-70b-versatile node dev-tools/unified-test-runner.js --health-check --groq

# Test with large context model
GROQ_MODEL=llama-3.1-8b-instant node dev-tools/unified-test-runner.js --health-check --groq
```

### Switch Models for Different Tasks

```properties
# In .env file
LLM_PROVIDER=groq

# For general testing
GROQ_MODEL=llama-3.3-70b-versatile

# For form analysis
FORM_ANALYSIS_MODEL=gemma2-9b-it

# For test generation
TEST_GENERATION_MODEL=llama3-70b-8192

# For quick verification
CODE_VERIFICATION_MODEL=llama3-8b-8192
```

## Performance Notes

- **8B models**: Fastest response, good for simple tasks
- **70B models**: Higher quality, better reasoning, slower
- **Large context models**: Better for complex forms with many fields
- **Instruction-tuned models** (gemma2-9b-it): Better at following specific formats

## Checking Model Availability

Use the unified test runner to check if a model is available:

```bash
# Check specific model
GROQ_MODEL=llama3-8b-8192 node dev-tools/unified-test-runner.js --health-check --groq

# Test E2E with specific model
GROQ_MODEL=gemma2-9b-it node dev-tools/unified-test-runner.js --e2e --groq
```

---

**Last Updated**: July 2, 2025
**API Endpoint**: https://api.groq.com/openai/v1/models
**Documentation**: https://console.groq.com/docs/models
