#!/usr/bin/env node
/**
 * Database seeding script
 * Populates the knowledge base with sample documents
 */

const mongoose = require("mongoose");
const config = require("../src/config");
const logger = require("../src/utils/logger");
const pythonProcessManager = require("../src/utils/pythonProcessManager");

const sampleDocuments = [
    {
        content:
            "Machine learning is a subset of artificial intelligence (AI) that enables computers to learn and improve from experience without being explicitly programmed. It focuses on developing algorithms that can access data and use it to learn for themselves.",
        meta: {
            topic: "Machine Learning",
            category: "AI Fundamentals",
            source: "seed_data",
        },
    },
    {
        content:
            "Deep learning is a subset of machine learning that uses neural networks with multiple layers to model complex patterns in data. It's particularly effective for tasks like image recognition, natural language processing, and speech recognition.",
        meta: {
            topic: "Deep Learning",
            category: "AI Fundamentals",
            source: "seed_data",
        },
    },
    {
        content:
            "Natural Language Processing (NLP) is a field of AI that focuses on enabling computers to understand, interpret, and generate human language. It combines computational linguistics with statistical and machine learning models.",
        meta: {
            topic: "Natural Language Processing",
            category: "AI Applications",
            source: "seed_data",
        },
    },
    {
        content:
            "Retrieval-Augmented Generation (RAG) is a technique that combines the strengths of retrieval-based and generation-based approaches. It retrieves relevant information from a knowledge base and uses it to generate more accurate and contextually appropriate responses.",
        meta: {
            topic: "RAG",
            category: "AI Techniques",
            source: "seed_data",
        },
    },
    {
        content:
            "Vector databases are specialized databases designed to store and query high-dimensional vectors efficiently. They use similarity search algorithms to find vectors that are most similar to a given query vector, making them essential for AI applications involving embeddings.",
        meta: {
            topic: "Vector Databases",
            category: "Data Storage",
            source: "seed_data",
        },
    },
    {
        content:
            "Transformers are a type of neural network architecture introduced in 2017 that revolutionized natural language processing. They use self-attention mechanisms to process sequential data and have become the foundation for most modern language models.",
        meta: {
            topic: "Transformers",
            category: "AI Architecture",
            source: "seed_data",
        },
    },
    {
        content:
            "Large Language Models (LLMs) are AI models trained on vast amounts of text data to understand and generate human-like text. They can perform various language tasks including translation, summarization, question answering, and creative writing.",
        meta: {
            topic: "Large Language Models",
            category: "AI Models",
            source: "seed_data",
        },
    },
    {
        content:
            "Computer vision is a field of AI that trains computers to interpret and understand visual information from the world. It involves techniques for image recognition, object detection, image segmentation, and scene understanding.",
        meta: {
            topic: "Computer Vision",
            category: "AI Applications",
            source: "seed_data",
        },
    },
];

async function seedDatabase() {
    try {
        logger.info("Starting database seeding process...");

        // Connect to MongoDB
        await mongoose.connect(config.MONGODB_URI);
        logger.info("Connected to MongoDB");

        // Clear existing documents (optional - comment out if you want to keep existing data)
        logger.info("Clearing existing documents from knowledge base...");
        await pythonProcessManager.executeScript("haystack_rag", ["index"]); // This will recreate the collection

        // Add sample documents to the knowledge base
        logger.info(`Adding ${sampleDocuments.length} sample documents...`);

        const result = await pythonProcessManager.executeScript("rag_chatbot", [
            "add_docs",
            ...sampleDocuments.map((doc) => doc.content),
        ]);

        if (result.error) {
            throw new Error(result.error);
        }

        logger.info(
            `Successfully added ${
                result.documents_indexed || sampleDocuments.length
            } documents to knowledge base`
        );

        // Test retrieval with a sample query
        logger.info("Testing document retrieval...");
        const testQuery = "What is machine learning?";
        const retrieveResult = await pythonProcessManager.executeScript(
            "haystack_rag",
            ["retrieve", testQuery, "3"]
        );

        if (retrieveResult.success) {
            logger.info(
                `Test query "${testQuery}" returned ${retrieveResult.documents.length} relevant documents`
            );
        }

        logger.info("Database seeding completed successfully!");
    } catch (error) {
        logger.error("Database seeding failed", { error: error.message });
        console.error("❌ Seeding failed:", error.message);
        process.exit(1);
    } finally {
        // Close database connection
        await mongoose.connection.close();
        logger.info("Database connection closed");
    }
}

// Run the seeding script
if (require.main === module) {
    seedDatabase()
        .then(() => {
            console.log("✅ Database seeding completed successfully!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Database seeding failed:", error.message);
            process.exit(1);
        });
}

module.exports = { seedDatabase, sampleDocuments };
