#!/usr/bin/env node

const JSRAGChatbot = require("../src/utils/js-rag-chatbot");
const pythonProcessManager = require("../src/utils/pythonProcessManager");
const path = require("path");

class ImplementationComparator {
    constructor() {
        this.pythonChatbot = null;
        this.jsChatbot = null;
        this.results = {
            python: { tests: [], totalTime: 0 },
            javascript: { tests: [], totalTime: 0 },
        };
    }

    async initialize() {
        try {
            // Initialize JavaScript chatbot
            console.log("🔧 Initializing JavaScript RAG Chatbot...");
            this.jsChatbot = new JSRAGChatbot();
            await this.jsChatbot.initialize();
            console.log("✅ JavaScript chatbot initialized");
        } catch (error) {
            console.error(
                "❌ Failed to initialize JavaScript chatbot:",
                error.message
            );
        }
    }

    async testLLMProviders(implementation) {
        console.log(`🔍 Testing ${implementation} LLM providers...`);

        const startTime = Date.now();
        let availableProviders = {};

        try {
            if (implementation === "javascript") {
                availableProviders = this.jsChatbot.getAvailableProviders();
            } else {
                // Test Python providers by running the providers command
                const result = await pythonProcessManager.executeScript(
                    "llm_factory",
                    ["providers"]
                );
                if (result.success) {
                    // The pythonProcessManager already parses JSON, so use result directly
                    availableProviders = result.available_providers || {};
                } else {
                    console.log("Python LLM factory failed:", result.error);
                    availableProviders = {};
                }
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            console.log(`✅ ${implementation} providers:`, availableProviders);
            console.log(`⏱️  Duration: ${duration}ms`);

            return {
                success: true,
                availableProviders,
                duration,
                implementation,
            };
        } catch (error) {
            console.error(
                `❌ ${implementation} provider test failed:`,
                error.message
            );
            return {
                success: false,
                error: error.message,
                duration: Date.now() - startTime,
                implementation,
            };
        }
    }

    async testDocumentOperations(implementation) {
        console.log(`🔍 Testing ${implementation} document operations...`);

        const startTime = Date.now();

        try {
            if (implementation === "javascript") {
                // Test document count
                const countResult = await this.jsChatbot.getDocumentCount();
                if (!countResult.success) {
                    throw new Error(countResult.error);
                }

                console.log(
                    `✅ ${implementation} document count: ${countResult.count}`
                );

                return {
                    success: true,
                    documentCount: countResult.count,
                    duration: Date.now() - startTime,
                    implementation,
                };
            } else {
                // Test Python document operations using stats command
                const countResult = await pythonProcessManager.executeScript(
                    "rag_chatbot",
                    ["stats"]
                );
                if (countResult.error) {
                    throw new Error(countResult.error);
                }

                const count = countResult.document_count || 0;
                console.log(`✅ ${implementation} document count: ${count}`);

                return {
                    success: true,
                    documentCount: count,
                    duration: Date.now() - startTime,
                    implementation,
                };
            }
        } catch (error) {
            console.error(
                `❌ ${implementation} document test failed:`,
                error.message
            );
            return {
                success: false,
                error: error.message,
                duration: Date.now() - startTime,
                implementation,
            };
        }
    }

    async testChatResponse(
        implementation,
        query = "What is machine learning?",
        provider = "gemini"
    ) {
        console.log(`💬 Testing ${implementation} chat response...`);
        console.log(`Query: "${query}"`);
        console.log(`Provider: ${provider}`);

        const startTime = Date.now();

        try {
            if (implementation === "javascript") {
                const result = await this.jsChatbot.generateResponse(
                    query,
                    provider,
                    true,
                    3
                );

                if (result.error) {
                    throw new Error(result.error);
                }

                console.log(
                    `✅ ${implementation} response generated (${result.response.length} chars)`
                );
                console.log(`📊 Usage: ${JSON.stringify(result.usage)}`);

                return {
                    success: true,
                    responseLength: result.response.length,
                    usage: result.usage,
                    duration: Date.now() - startTime,
                    implementation,
                };
            } else {
                // Test Python chat response
                const pythonArgs = ["chat", query, provider, "true", "3"];
                const result = await pythonProcessManager.executeScript(
                    "rag_chatbot",
                    pythonArgs
                );

                if (result.error) {
                    throw new Error(result.error);
                }

                // The pythonProcessManager already parses JSON, so use result directly
                console.log(
                    `✅ ${implementation} response generated (${
                        result.response?.length || 0
                    } chars)`
                );
                console.log(`📊 Usage: ${JSON.stringify(result.usage || {})}`);

                return {
                    success: true,
                    responseLength: result.response?.length || 0,
                    usage: result.usage || {},
                    duration: Date.now() - startTime,
                    implementation,
                };
            }
        } catch (error) {
            console.error(
                `❌ ${implementation} chat test failed:`,
                error.message
            );
            return {
                success: false,
                error: error.message,
                duration: Date.now() - startTime,
                implementation,
            };
        }
    }

    async runComparisonTest(testName, testFunction, ...args) {
        console.log(`\n🧪 Running ${testName} comparison test`);
        console.log("=".repeat(50));

        // Test JavaScript implementation
        console.log("\n🔹 Testing JavaScript implementation:");
        const jsResult = await testFunction.call(this, "javascript", ...args);
        this.results.javascript.tests.push({
            name: testName,
            ...jsResult,
        });
        this.results.javascript.totalTime += jsResult.duration;

        // Test Python implementation
        console.log("\n🐍 Testing Python implementation:");
        const pythonResult = await testFunction.call(this, "python", ...args);
        this.results.python.tests.push({
            name: testName,
            ...pythonResult,
        });
        this.results.python.totalTime += pythonResult.duration;

        return {
            javascript: jsResult,
            python: pythonResult,
        };
    }

    generateComparisonReport() {
        console.log("\n" + "=".repeat(60));
        console.log("📊 COMPARISON TEST RESULTS");
        console.log("=".repeat(60));

        // Summary statistics
        const jsTests = this.results.javascript.tests;
        const pythonTests = this.results.python.tests;

        const jsSuccessful = jsTests.filter((t) => t.success).length;
        const pythonSuccessful = pythonTests.filter((t) => t.success).length;

        console.log(`\n📈 Success Rates:`);
        console.log(
            `JavaScript: ${jsSuccessful}/${jsTests.length} tests passed (${(
                (jsSuccessful / jsTests.length) *
                100
            ).toFixed(1)}%)`
        );
        console.log(
            `Python: ${pythonSuccessful}/${pythonTests.length} tests passed (${(
                (pythonSuccessful / pythonTests.length) *
                100
            ).toFixed(1)}%)`
        );

        console.log(`\n⏱️  Total Execution Time:`);
        console.log(`JavaScript: ${this.results.javascript.totalTime}ms`);
        console.log(`Python: ${this.results.python.totalTime}ms`);

        if (this.results.python.totalTime > 0) {
            const timeRatio = (
                this.results.javascript.totalTime /
                this.results.python.totalTime
            ).toFixed(2);
            console.log(`Time ratio (JS/Python): ${timeRatio}x`);
        }

        // Detailed results
        console.log(`\n📋 Detailed Test Results:`);
        for (let i = 0; i < jsTests.length; i++) {
            const jsTest = jsTests[i];
            const pythonTest = pythonTests[i];

            console.log(`\n🔹 ${jsTest.name}:`);
            console.log(
                `   JavaScript: ${jsTest.success ? "✅" : "❌"} (${
                    jsTest.duration
                }ms)`
            );
            console.log(
                `   Python:     ${pythonTest.success ? "✅" : "❌"} (${
                    pythonTest.duration
                }ms)`
            );

            if (jsTest.success && pythonTest.success) {
                const faster =
                    jsTest.duration < pythonTest.duration
                        ? "JavaScript"
                        : "Python";
                const diff = Math.abs(jsTest.duration - pythonTest.duration);
                console.log(`   Winner: ${faster} (by ${diff}ms)`);
            }
        }

        // Recommendations
        console.log(`\n💡 Recommendations:`);
        if (jsSuccessful > pythonSuccessful) {
            console.log(`- JavaScript implementation has higher success rate`);
        } else if (pythonSuccessful > jsSuccessful) {
            console.log(`- Python implementation has higher success rate`);
        } else {
            console.log(`- Both implementations have similar success rates`);
        }

        if (this.results.javascript.totalTime < this.results.python.totalTime) {
            console.log(`- JavaScript implementation is faster overall`);
        } else {
            console.log(`- Python implementation is faster overall`);
        }

        return this.results;
    }

    async runFullComparisonSuite() {
        console.log("🚀 Starting Implementation Comparison Suite");
        console.log("=".repeat(60));

        await this.initialize();

        // Run all comparison tests
        await this.runComparisonTest("LLM Providers", this.testLLMProviders);
        await this.runComparisonTest(
            "Document Operations",
            this.testDocumentOperations
        );
        await this.runComparisonTest(
            "Basic Chat Response",
            this.testChatResponse,
            "What is artificial intelligence?"
        );
        await this.runComparisonTest(
            "Complex Chat Response",
            this.testChatResponse,
            "Explain the difference between supervised and unsupervised machine learning in detail.",
            "gemini"
        );

        // Generate final report
        const results = this.generateComparisonReport();

        console.log("\n" + "=".repeat(60));
        console.log("✅ Comparison suite completed!");
        console.log("=".repeat(60));

        return results;
    }
}

async function main() {
    const comparator = new ImplementationComparator();

    try {
        await comparator.runFullComparisonSuite();
    } catch (error) {
        console.error("❌ Comparison suite failed:", error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = ImplementationComparator;
