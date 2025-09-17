#!/usr/bin/env node
/**
 * Health check script
 * Verifies that all components are working correctly
 */

const axios = require("axios");
const config = require("../src/config");
const logger = require("../src/utils/logger");
const pythonProcessManager = require("../src/utils/pythonProcessManager");

const BASE_URL = `http://localhost:${config.PORT}`;

async function checkService(url, name) {
    try {
        const response = await axios.get(url, { timeout: 5000 });
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
            ["gemini", "test"]
        );
        if (llmResult.error) {
            console.log(`❌ LLM Factory: ${llmResult.error}`);
            return false;
        }
        console.log("✅ LLM Factory: OK");

        // Test Haystack RAG
        const ragResult = await pythonProcessManager.executeScript(
            "haystack_rag",
            ["count"]
        );
        if (ragResult.error) {
            console.log(`❌ Haystack RAG: ${ragResult.error}`);
            return false;
        }
        console.log(`✅ Haystack RAG: OK (${ragResult.count || 0} documents)`);

        // Test RAG Chatbot
        const chatbotResult = await pythonProcessManager.executeScript(
            "rag_chatbot",
            ["stats"]
        );
        if (chatbotResult.error) {
            console.log(`❌ RAG Chatbot: ${chatbotResult.error}`);
            return false;
        }
        console.log("✅ RAG Chatbot: OK");

        return true;
    } catch (error) {
        console.log(`❌ Python components check failed: ${error.message}`);
        return false;
    }
}

async function runHealthCheck() {
    console.log("🏥 Running Health Check...");
    console.log("=" * 50);

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

    // Summary
    console.log("\n" + "=" * 50);
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
