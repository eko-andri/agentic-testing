#!/usr/bin/env node

/**
 * 🎯 UNIFIED TEST RUNNER - CENTRALIZED TESTING FRAMEWORK
 * 
 * Usage Examples:
 * node unified-test-runner.js --e2e --bedrock-claude4
 * node unified-test-runner.js --e2e --ollama-qwen
 * node unified-test-runner.js --health-check --all-providers
 * node unified-test-runner.js --clean-all
 * 
 * Features:
 * - Centralized provider testing
 * - Reusable test utilities  
 * - Standardized output format
 * - Clean parameter system
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');

// Import provider utilities
const { ProviderManager } = require('../providers');
const { callLLM } = require('../utils');

class UnifiedTestRunner {
    constructor() {
        this.providerManager = new ProviderManager();
        this.testResults = {
            timestamp: new Date().toISOString(),
            tests: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                duration: 0
            }
        };
    }

    /**
     * Parse command line arguments
     */
    parseArgs(args) {
        const params = {
            mode: null,
            provider: null,
            model: null,
            options: {}
        };

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            
            if (arg === '--e2e') {
                params.mode = 'e2e';
            } else if (arg === '--health-check') {
                params.mode = 'health-check';
            } else if (arg === '--clean-all') {
                params.mode = 'clean-all';
            } else if (arg.startsWith('--bedrock-')) {
                params.provider = 'bedrock';
                params.model = arg.replace('--bedrock-', '');
            } else if (arg.startsWith('--ollama-')) {
                params.provider = 'ollama';
                params.model = arg.replace('--ollama-', '');
            } else if (arg.startsWith('--groq-')) {
                params.provider = 'groq';
                params.model = arg.replace('--groq-', '');
            } else if (arg.startsWith('--openai-')) {
                params.provider = 'openai';
                params.model = arg.replace('--openai-', '');
            } else if (arg.startsWith('--anthropic-')) {
                params.provider = 'anthropic';
                params.model = arg.replace('--anthropic-', '');
            } else if (arg === '--all-providers') {
                params.options.allProviders = true;
            } else if (arg === '--verbose') {
                params.options.verbose = true;
            }
        }

        return params;
    }

    /**
     * Main runner method
     */
    async run(args = process.argv.slice(2)) {
        const params = this.parseArgs(args);
        const startTime = Date.now();

        console.log('🚀 Unified Test Runner Starting...');
        console.log(`📋 Mode: ${params.mode}`);
        console.log(`🔧 Provider: ${params.provider || 'auto'}`);
        console.log(`🎯 Model: ${params.model || 'default'}`);
        console.log('');

        try {
            let result = false;

            switch (params.mode) {
                case 'e2e':
                    result = await this.runE2ETest(params);
                    break;
                case 'health-check':
                    result = await this.runHealthCheck(params);
                    break;
                case 'clean-all':
                    result = await this.cleanAll();
                    break;
                default:
                    console.log('📖 Available commands:');
                    console.log('  --e2e --bedrock-claude4    : Run E2E test with Bedrock Claude 4');
                    console.log('  --e2e --ollama-qwen        : Run E2E test with Ollama Qwen');
                    console.log('  --health-check --all-providers : Check all provider health');
                    console.log('  --clean-all                : Clean all test files and databases');
                    result = true;
            }

            this.testResults.summary.duration = Date.now() - startTime;
            this.saveTestResults();

            process.exit(result ? 0 : 1);

        } catch (error) {
            console.error('❌ Unified Test Runner failed:', error.message);
            process.exit(1);
        }
    }

    /**
     * Run E2E test with specified provider
     */
    async runE2ETest(params) {
        console.log(`🧪 Running E2E Test: ${params.provider}-${params.model}\n`);

        try {
            // Step 1: Check provider availability
            const availability = await this.checkProviderAvailability(params.provider, params.model);
            if (!availability.available) {
                throw new Error(`Provider ${params.provider} with model ${params.model} not available: ${availability.reason}`);
            }

            // Step 2: Get base prompt for model type
            const basePrompt = this.getBasePrompt(params.model);

            // Step 3: Execute test generation
            const testResult = await this.executeTestGeneration(params.provider, params.model, basePrompt);

            // Step 4: Parse and validate output
            const parsedResult = this.parseTestOutput(testResult, params.model);

            // Step 5: Record results
            this.recordTestResult({
                name: `E2E-${params.provider}-${params.model}`,
                success: true,
                metrics: parsedResult.metrics,
                output: parsedResult.code
            });

            console.log('✅ E2E Test completed successfully!');
            return true;

        } catch (error) {
            this.recordTestResult({
                name: `E2E-${params.provider}-${params.model}`,
                success: false,
                error: error.message
            });

            console.error('❌ E2E Test failed:', error.message);
            return false;
        }
    }

    /**
     * Check provider availability
     */
    async checkProviderAvailability(providerName, modelName) {
        console.log(`🔍 Checking ${providerName} availability...`);

        try {
            // Initialize provider manager if needed
            if (!this.providerManager.isInitialized) {
                await this.providerManager.initialize();
            }

            const provider = this.providerManager.getProvider(providerName);
            if (!provider) {
                return { available: false, reason: 'Provider not found' };
            }

            const isAvailable = await provider.isAvailable();
            if (!isAvailable) {
                return { available: false, reason: 'Provider not available' };
            }

            // Test with simple prompt
            const testResult = await provider.call({
                prompt: 'Test connection with simple response.',
                system: 'Respond briefly to confirm connection.',
                temperature: 0.1,
                model: modelName
            });

            console.log(`✅ ${providerName} is available and responding`);
            return { available: true, testResponse: testResult };

        } catch (error) {
            console.log(`❌ ${providerName} availability check failed: ${error.message}`);
            return { available: false, reason: error.message };
        }
    }

    /**
     * Get base prompt optimized for specific model type
     */
    getBasePrompt(modelType) {
        const basePrompts = {
            'claude4': {
                system: 'Generate TypeScript Playwright test code. NO explanations, direct code output only.',
                user: 'Create a comprehensive test for form validation with email, password, and submit button. Include Page Object Model pattern.',
                expectations: {
                    shouldStartWith: 'import',
                    shouldContain: ['test(', 'expect', 'page.locator'],
                    shouldNotContain: ['I will', 'Here is', 'Let me']
                }
            },
            'qwen': {
                system: 'You are a Playwright TypeScript test generator. Generate clean, executable code.',
                user: 'Generate a Playwright test suite for login form validation with proper assertions.',
                expectations: {
                    shouldStartWith: 'import',
                    shouldContain: ['test(', 'expect', 'async'],
                    shouldNotContain: ['explanation', 'narrative']
                }
            },
            'default': {
                system: 'Generate Playwright TypeScript test code only. No explanations.',
                user: 'Create a test for form validation with proper assertions and error handling.',
                expectations: {
                    shouldStartWith: 'import',
                    shouldContain: ['test(', 'expect'],
                    shouldNotContain: []
                }
            }
        };

        return basePrompts[modelType] || basePrompts['default'];
    }

    /**
     * Execute test generation with specified provider
     */
    async executeTestGeneration(providerName, modelName, basePrompt) {
        console.log(`🎯 Generating test with ${providerName}-${modelName}...`);

        const startTime = Date.now();

        const response = await callLLM({
            prompt: basePrompt.user,
            system: basePrompt.system,
            temperature: 0.1,
            provider: providerName,
            model: modelName
        });

        const duration = Date.now() - startTime;

        console.log(`⏱️  Generation completed in ${(duration / 1000).toFixed(2)}s`);
        console.log(`📊 Response length: ${response.length} characters`);

        return {
            content: response,
            duration: duration,
            provider: providerName,
            model: modelName,
            prompt: basePrompt
        };
    }

    /**
     * Parse and validate test output
     */
    parseTestOutput(testResult, modelType) {
        console.log('🔍 Parsing and validating output...');

        const content = testResult.content;
        const prompt = testResult.prompt;
        
        const metrics = {
            length: content.length,
            lines: content.split('\n').length,
            duration: testResult.duration,
            provider: testResult.provider,
            model: testResult.model
        };

        // Validate expectations
        const validations = {
            startsCorrect: prompt.expectations.shouldStartWith ? 
                content.trim().startsWith(prompt.expectations.shouldStartWith) : true,
            
            containsRequired: prompt.expectations.shouldContain.every(item => 
                content.includes(item)),
            
            avoidsNarratives: prompt.expectations.shouldNotContain.every(item => 
                !content.toLowerCase().includes(item.toLowerCase()))
        };

        const isValid = Object.values(validations).every(v => v);

        console.log(`✅ Validation results:`);
        console.log(`   Correct start: ${validations.startsCorrect ? '✅' : '❌'}`);
        console.log(`   Required content: ${validations.containsRequired ? '✅' : '❌'}`);
        console.log(`   Avoids narratives: ${validations.avoidsNarratives ? '✅' : '❌'}`);
        console.log(`   Overall valid: ${isValid ? '✅' : '❌'}`);

        return {
            code: content,
            metrics: {
                ...metrics,
                validations,
                isValid
            }
        };
    }

    /**
     * Run health check for providers
     */
    async runHealthCheck(params) {
        console.log('🏥 Running Provider Health Check...\n');

        try {
            await this.providerManager.initialize();
            const availableProviders = this.providerManager.getAvailableProviders();

            for (const providerName of availableProviders) {
                const result = await this.checkProviderAvailability(providerName, null);
                this.recordTestResult({
                    name: `Health-${providerName}`,
                    success: result.available,
                    error: result.reason || null
                });
            }

            console.log('\n🏥 Health Check Summary:');
            this.testResults.tests.forEach(test => {
                const status = test.success ? '✅' : '❌';
                console.log(`   ${status} ${test.name}`);
            });

            return true;

        } catch (error) {
            console.error('❌ Health check failed:', error.message);
            return false;
        }
    }

    /**
     * Clean all test files and databases
     */
    async cleanAll() {
        console.log('🧹 Cleaning all test files and databases...\n');

        const pathsToClean = [
            '../tests',
            '../test-results',
            '../database',
            './dev-tools/test-*.js',
            './dev-tools/debug-*.js'
        ];

        let cleaned = 0;

        for (const cleanPath of pathsToClean) {
            try {
                const fullPath = path.resolve(__dirname, cleanPath);
                
                if (cleanPath.includes('*')) {
                    // Handle glob patterns
                    const dir = path.dirname(fullPath);
                    const pattern = path.basename(fullPath);
                    
                    if (fs.existsSync(dir)) {
                        const files = fs.readdirSync(dir).filter(f => 
                            f.match(pattern.replace('*', '.*'))
                        );
                        
                        files.forEach(file => {
                            const filePath = path.join(dir, file);
                            fs.unlinkSync(filePath);
                            console.log(`🗑️  Removed: ${file}`);
                            cleaned++;
                        });
                    }
                } else {
                    // Handle direct paths
                    if (fs.existsSync(fullPath)) {
                        const stats = fs.statSync(fullPath);
                        
                        if (stats.isDirectory()) {
                            fs.rmSync(fullPath, { recursive: true, force: true });
                            console.log(`🗑️  Removed directory: ${path.basename(fullPath)}`);
                        } else {
                            fs.unlinkSync(fullPath);
                            console.log(`🗑️  Removed file: ${path.basename(fullPath)}`);
                        }
                        cleaned++;
                    }
                }
            } catch (error) {
                console.log(`⚠️  Could not clean ${cleanPath}: ${error.message}`);
            }
        }

        console.log(`\n✅ Cleanup completed! ${cleaned} items removed.`);
        return true;
    }

    /**
     * Record test result
     */
    recordTestResult(result) {
        this.testResults.tests.push({
            ...result,
            timestamp: new Date().toISOString()
        });

        this.testResults.summary.total++;
        if (result.success) {
            this.testResults.summary.passed++;
        } else {
            this.testResults.summary.failed++;
        }
    }

    /**
     * Save test results to file
     */
    saveTestResults() {
        const resultPath = path.resolve(__dirname, '../test-results/unified-test-results.json');
        
        // Ensure directory exists
        const dir = path.dirname(resultPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(resultPath, JSON.stringify(this.testResults, null, 2));
        console.log(`\n💾 Test results saved to: ${resultPath}`);
    }
}

// Run if called directly
if (require.main === module) {
    const runner = new UnifiedTestRunner();
    runner.run().catch(error => {
        console.error('❌ Runner execution failed:', error.message);
        process.exit(1);
    });
}

module.exports = UnifiedTestRunner;
