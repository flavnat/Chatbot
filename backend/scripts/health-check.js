#!/usr/bin/env node
/**
 * Health check script
 * Verifies that all components are working correctly
 */

const axios = require("axios");
const config = require("../src/config");
const logger = require("../src/utils/logger");
const pythonProcessManager = require("../src/utils/pythonProcessManager");
const JSRAGChatbot = require("../src/utils/js-rag-chatbot");
const JSRAG = require("../src/utils/js-rag");
const JSLLMFactory = require("../src/utils/js-llm-factory");

const BASE_URL = `http://localhost:${config.PORT}`;

async function checkService(url, name) {
    try {
        // Allow longer timeout to accommodate Python-backed endpoints
        const response = await axios.get(url, { timeout: 60000 }); // 60s
        if (response.status === 200) {
            console.log(`✅ ${name}: OK`);
            return true;
        } else {
            console.log(`❌ ${name}: Status ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ ${name}: ${error.message}`);
        return false;
    }
}

async function checkPythonComponents() {
    try {
        console.log("🔍 Checking Python components...");

        // Test LLM factory
        const llmResult = await pythonProcessManager.executeScript(
            "llm_factory",
            ["providers"]
        );
        if (llmResult.error) {
            console.log(`❌ Python LLM Factory: ${llmResult.error}`);
            return false;
        }
        console.log("✅ Python LLM Factory: OK");

        // Test Haystack RAG
        const ragResult = await pythonProcessManager.executeScript(
            "haystack_rag",
            ["count"]
        );
        if (ragResult.error) {
            console.log(`❌ Python Haystack RAG: ${ragResult.error}`);
            return false;
        }
        console.log(
            `✅ Python Haystack RAG: OK (${ragResult.count || 0} documents)`
        );

        // Test RAG Chatbot
        const chatbotResult = await pythonProcessManager.executeScript(
            "rag_chatbot",
            ["stats"]
        );
        if (chatbotResult.error) {
            console.log(`❌ Python RAG Chatbot: ${chatbotResult.error}`);
            return false;
        }
        console.log("✅ Python RAG Chatbot: OK");

        return true;
    } catch (error) {
        console.log(`❌ Python components check failed: ${error.message}`);
        return false;
    }
}

async function checkJavaScriptComponents() {
    try {
        console.log("🔍 Checking JavaScript components...");

        // Test JS LLM Factory
        const jsLLMFactory = new JSLLMFactory();
        const availableProviders = jsLLMFactory.getAvailableProviders();
        const availableCount =
            Object.values(availableProviders).filter(Boolean).length;

        if (availableCount === 0) {
            console.log("❌ JS LLM Factory: No providers available");
            return false;
        }
        console.log(
            `✅ JS LLM Factory: OK (${availableCount} providers available)`
        );

        // Test JS RAG Pipeline
        const jsRAG = new JSRAG();
        await jsRAG.initialize();

        const countResult = await jsRAG.getDocumentCount();
        if (!countResult.success) {
            console.log(`❌ JS RAG Pipeline: ${countResult.error}`);
            return false;
        }
        console.log(`✅ JS RAG Pipeline: OK (${countResult.count} documents)`);

        // Test JS RAG Chatbot
        const jsChatbot = new JSRAGChatbot();
        await jsChatbot.initialize();

        // Test a simple response generation
        const testResponse = await jsChatbot.generateResponse(
            "Hello",
            "gemini",
            false, // Don't use RAG for this simple test
            1
        );

        if (testResponse.error) {
            console.log(`❌ JS RAG Chatbot: ${testResponse.error}`);
            return false;
        }
        console.log("✅ JS RAG Chatbot: OK");

        return true;
    } catch (error) {
        console.log(`❌ JavaScript components check failed: ${error.message}`);
        return false;
    }
}

async function runHealthCheck() {
    console.log("🏥 Running Health Check...");
    console.log("=".repeat(50));

    let allHealthy = true;

    // Check API endpoints
    console.log("\n📡 Checking API endpoints...");
    const apiChecks = [
        [`${BASE_URL}/api/health`, "API Health"],
        [`${BASE_URL}/api`, "API Info"],
        [`${BASE_URL}/api/chat/stats`, "Chat Stats"],
    ];

    for (const [url, name] of apiChecks) {
        const healthy = await checkService(url, name);
        if (!healthy) allHealthy = false;
    }

    // Check Python components
    console.log("\n🐍 Checking Python components...");
    const pythonHealthy = await checkPythonComponents();
    if (!pythonHealthy) allHealthy = false;

    // Check JavaScript components
    console.log("\n🔹 Checking JavaScript components...");
    const jsHealthy = await checkJavaScriptComponents();
    if (!jsHealthy) allHealthy = false;

    // Summary
    console.log("\n" + "=".repeat(50));
    if (allHealthy) {
        console.log("🎉 All systems are healthy!");
        process.exit(0);
    } else {
        console.log(
            "⚠️  Some systems are not healthy. Please check the errors above."
        );
        process.exit(1);
    }
}

// Run health check if called directly
if (require.main === module) {
    runHealthCheck().catch((error) => {
        console.error("❌ Health check failed:", error.message);
        process.exit(1);
    });
}

module.exports = { runHealthCheck };
