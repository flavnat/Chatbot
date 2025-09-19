#!const { QdrantClient } = require('@qdrant/js-client-rest');usr/bin/env node

const { QdrantClient } = require("@qdrant/js-client-rest");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

async function createQdrantCollection() {
    try {
        // Get configuration from environment
        const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";
        const qdrantApiKey = process.env.QDRANT_API_KEY;
        const collectionName =
            process.env.QDRANT_COLLECTION_NAME || "chatbot_documents";

        console.log(`Connecting to Qdrant at: ${qdrantUrl}`);
        console.log(`Collection name: ${collectionName}`);
        console.log(`API key present: ${!!qdrantApiKey}`);

        // Initialize Qdrant client
        let client;
        if (qdrantApiKey) {
            client = new QdrantClient({
                url: qdrantUrl,
                apiKey: qdrantApiKey,
            });
        } else {
            client = new QdrantClient({ url: qdrantUrl });
        }

        // Check if collection exists
        const collections = await client.getCollections();
        const collectionNames = collections.collections.map((col) => col.name);

        if (collectionNames.includes(collectionName)) {
            console.log(`✅ Collection '${collectionName}' already exists`);
            // Get collection info
            const collectionInfo = await client.getCollection(collectionName);
            console.log(`Collection info:`, collectionInfo);
            return {
                success: true,
                message: `Collection '${collectionName}' already exists`,
                status: "existing",
            };
        }

        // Create new collection
        console.log(`Creating collection '${collectionName}'...`);

        // Create collection with vector parameters for sentence-transformers/all-MiniLM-L6-v2
        // This model produces 384-dimensional embeddings
        await client.createCollection(collectionName, {
            vectors: {
                size: 384, // Embedding dimension for all-MiniLM-L6-v2
                distance: "Cosine", // Cosine similarity for semantic search
            },
        });

        console.log(`✅ Collection '${collectionName}' created successfully`);

        // Verify collection was created
        const updatedCollections = await client.getCollections();
        const updatedCollectionNames = updatedCollections.collections.map(
            (col) => col.name
        );

        if (updatedCollectionNames.includes(collectionName)) {
            const collectionInfo = await client.getCollection(collectionName);
            console.log(
                `✅ Collection verification successful: status=${collectionInfo.status} optimizer_status=${collectionInfo.optimizer_status} vectors_count=${collectionInfo.vectors_count} points_count=${collectionInfo.points_count}`
            );
            return {
                success: true,
                message: `Collection '${collectionName}' created and verified successfully`,
                status: "created",
                collectionInfo: {
                    name: collectionName,
                    vectorsCount: collectionInfo.vectors_count,
                    pointsCount: collectionInfo.points_count,
                    status: collectionInfo.status,
                },
            };
        } else {
            throw new Error("Collection creation verification failed");
        }
    } catch (error) {
        console.error(
            `❌ Failed to create Qdrant collection: ${error.message}`
        );
        return {
            success: false,
            error: error.message,
        };
    }
}

async function testCollectionConnection() {
    try {
        const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";
        const qdrantApiKey = process.env.QDRANT_API_KEY;
        const collectionName =
            process.env.QDRANT_COLLECTION_NAME || "chatbot_documents";

        console.log("Testing Qdrant connection...");

        let client;
        if (qdrantApiKey) {
            client = new QdrantClient({
                url: qdrantUrl,
                apiKey: qdrantApiKey,
            });
        } else {
            client = new QdrantClient({ url: qdrantUrl });
        }

        // Test connection by getting collection info
        const collectionInfo = await client.getCollection(collectionName);
        const count = collectionInfo.points_count;

        console.log(`✅ Connection test passed. Document count: ${count}`);

        return {
            success: true,
            message: "Qdrant connection test passed",
            documentCount: count,
        };
    } catch (error) {
        console.error(`❌ Connection test failed: ${error.message}`);
        return {
            success: false,
            error: error.message,
        };
    }
}

async function main() {
    console.log("🚀 Starting JavaScript Qdrant Collection Setup");
    console.log("=".repeat(50));

    // Create collection
    const result = await createQdrantCollection();

    if (result.success) {
        console.log(`✅ ${result.message}`);

        // Test connection
        console.log("\n🔍 Testing connection...");
        const testResult = await testCollectionConnection();

        if (testResult.success) {
            console.log(`✅ ${testResult.message}`);
        } else {
            console.log(`❌ Connection test failed: ${testResult.error}`);
        }
    } else {
        console.log(`❌ ${result.error}`);
        process.exit(1);
    }

    console.log("\n" + "=".repeat(50));
    if (result.success) {
        console.log(
            "🎉 JavaScript Qdrant collection setup completed successfully!"
        );
        console.log(
            `Collection: ${
                process.env.QDRANT_COLLECTION_NAME || "chatbot_documents"
            }`
        );
        console.log(
            `URL: ${process.env.QDRANT_URL || "http://localhost:6333"}`
        );
        console.log(`Implementation: JavaScript`);
    } else {
        console.log("⚠️  JavaScript Qdrant collection setup failed");
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { createQdrantCollection, testCollectionConnection };
