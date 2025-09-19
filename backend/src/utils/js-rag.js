const { QdrantClient } = require("@qdrant/js-client-rest");
const { pipeline } = require("@xenova/transformers");
const path = require("path");
const fs = require("fs").promises;
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

class JSRAG {
    constructor() {
        this.client = null;
        this.embedder = null;
        this.collectionName =
            process.env.QDRANT_COLLECTION_NAME || "chatbot_documents";
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            // Initialize Qdrant client
            const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";
            const qdrantApiKey = process.env.QDRANT_API_KEY;

            if (qdrantApiKey) {
                this.client = new QdrantClient({
                    url: qdrantUrl,
                    apiKey: qdrantApiKey,
                });
            } else {
                this.client = new QdrantClient({ url: qdrantUrl });
            }

            // Initialize sentence transformer for embeddings
            console.log("Loading sentence transformer model...");
            this.embedder = await pipeline(
                "feature-extraction",
                "Xenova/all-MiniLM-L6-v2"
            );
            console.log("Sentence transformer loaded successfully");

            this.initialized = true;
            console.log("JS RAG initialized successfully");
        } catch (error) {
            console.error("Failed to initialize JS RAG:", error);
            throw error;
        }
    }

    async generateEmbedding(text) {
        if (!this.initialized) await this.initialize();

        try {
            const output = await this.embedder(text, {
                pooling: "mean",
                normalize: true,
            });
            return Array.from(output.data);
        } catch (error) {
            console.error("Error generating embedding:", error);
            throw error;
        }
    }

    async indexDocuments(documents) {
        if (!this.initialized) await this.initialize();

        try {
            const points = [];

            for (let i = 0; i < documents.length; i++) {
                const doc = documents[i];
                const content = String(doc.content || "");
                const embedding = await this.generateEmbedding(content);

                points.push({
                    id: Date.now() + i, // Simple ID generation
                    vector: embedding,
                    payload: {
                        content: content,
                        meta: doc.meta || {},
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            // Upsert points to Qdrant
            await this.client.upsert(this.collectionName, {
                points: points,
            });

            console.log(`Successfully indexed ${documents.length} documents`);
            return {
                success: true,
                documentsIndexed: documents.length,
                message: `Successfully indexed ${documents.length} documents`,
            };
        } catch (error) {
            console.error("Error indexing documents:", error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    async retrieveDocuments(query, topK = 3) {
        if (!this.initialized) await this.initialize();

        try {
            const queryEmbedding = await this.generateEmbedding(query);

            const searchResult = await this.client.search(this.collectionName, {
                vector: queryEmbedding,
                limit: topK,
                with_payload: true,
                with_vector: false,
            });

            const documents = searchResult.map((hit) => ({
                content: hit.payload.content,
                meta: hit.payload.meta,
                score: hit.score,
            }));

            return {
                success: true,
                query: query,
                documents: documents,
                count: documents.length,
            };
        } catch (error) {
            console.error("Error retrieving documents:", error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    async searchSimilar(query, topK = 5) {
        return this.retrieveDocuments(query, topK);
    }

    async getDocumentCount() {
        if (!this.initialized) await this.initialize();

        try {
            const collectionInfo = await this.client.getCollection(
                this.collectionName
            );
            return {
                success: true,
                count: collectionInfo.points_count || 0,
                collectionName: this.collectionName,
            };
        } catch (error) {
            console.error("Error getting document count:", error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    async deleteDocuments(documentIds = null) {
        if (!this.initialized) await this.initialize();

        try {
            if (documentIds && documentIds.length > 0) {
                // Delete specific documents
                await this.client.delete(this.collectionName, {
                    points: documentIds,
                });
                const message = `Deleted ${documentIds.length} documents`;
                console.log(message);
                return {
                    success: true,
                    message: message,
                };
            } else {
                // Clear all documents by recreating collection
                await this.client.deleteCollection(this.collectionName);
                await this.client.createCollection(this.collectionName, {
                    vectors: {
                        size: 384,
                        distance: "Cosine",
                    },
                });
                const message = "Cleared all documents from collection";
                console.log(message);
                return {
                    success: true,
                    message: message,
                };
            }
        } catch (error) {
            console.error("Error deleting documents:", error);
            return {
                success: false,
                error: error.message,
            };
        }
    }
}

module.exports = JSRAG;
