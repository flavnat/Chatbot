const JSRAG = require("./js-rag");
const JSLLMFactory = require("./js-llm-factory");

class JSRAGChatbot {
    constructor() {
        this.llmFactory = null;
        this.ragPipeline = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            // Initialize LLM factory
            this.llmFactory = new JSLLMFactory();

            // Initialize RAG pipeline
            this.ragPipeline = new JSRAG();
            await this.ragPipeline.initialize();

            this.initialized = true;
            console.log("JS RAG Chatbot initialized successfully");
        } catch (error) {
            console.error("Failed to initialize JS RAG Chatbot:", error);
            throw error;
        }
    }

    async generateResponse(
        query,
        provider = "gemini",
        useRag = true,
        topK = 3,
        options = {}
    ) {
        if (!this.initialized) await this.initialize();

        try {
            let contextDocs = [];
            let contextText = "";

            // Retrieve relevant documents if RAG is enabled
            if (useRag) {
                const retrievalResult =
                    await this.ragPipeline.retrieveDocuments(query, topK);
                if (retrievalResult.success) {
                    contextDocs = retrievalResult.documents;
                    // Combine document contents for context
                    const contextTexts = contextDocs
                        .filter((doc) => doc.content)
                        .map((doc) => doc.content);
                    contextText = contextTexts.join("\n\n");
                }
            }

            // Create enhanced prompt with context
            let enhancedPrompt;
            if (contextText) {
                enhancedPrompt = `Based on the following context information, please answer the user's question.
If the context doesn't contain relevant information, use your general knowledge to provide a helpful response.

Context:
${contextText}

Question: ${query}

Please provide a comprehensive and accurate answer based on the available context and your knowledge.`;
            } else {
                enhancedPrompt = query;
            }

            // Generate response using LLM
            const llmResult = await this.llmFactory.generateResponse(
                provider,
                enhancedPrompt,
                options
            );

            // Combine results
            const result = {
                response: llmResult.response,
                provider: llmResult.provider,
                model: llmResult.model,
                usage: llmResult.usage,
                ragUsed: useRag,
                contextDocuments: contextDocs.length,
                query: query,
            };

            if (useRag) {
                result.retrievedDocuments = contextDocs;
            }

            return result;
        } catch (error) {
            console.error("Error generating JS RAG response:", error);
            return {
                error: error.message,
                query: query,
                provider: provider,
                ragUsed: useRag,
            };
        }
    }

    async addDocuments(documents) {
        if (!this.initialized) await this.initialize();

        try {
            const result = await this.ragPipeline.indexDocuments(documents);
            return result;
        } catch (error) {
            console.error("Error adding documents:", error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    async getStats() {
        if (!this.initialized) await this.initialize();

        try {
            const docCount = await this.ragPipeline.getDocumentCount();
            const availableProviders = this.llmFactory.getAvailableProviders();

            return {
                success: true,
                documentCount: docCount.success ? docCount.count : 0,
                availableProviders: availableProviders,
                ragEnabled: true,
                implementation: "javascript",
            };
        } catch (error) {
            console.error("Error getting stats:", error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    // Utility methods for direct access to components
    async getDocumentCount() {
        if (!this.initialized) await this.initialize();
        return this.ragPipeline.getDocumentCount();
    }

    async deleteDocuments(documentIds = null) {
        if (!this.initialized) await this.initialize();
        return this.ragPipeline.deleteDocuments(documentIds);
    }

    getAvailableProviders() {
        if (!this.initialized) return {};
        return this.llmFactory.getAvailableProviders();
    }
}

module.exports = JSRAGChatbot;
