#!/usr/bin/env node
/**
 * Vector Database seeding script
 * Populates the knowledge base with sample documents
 */

const config = require("../src/config");
const logger = require("../src/utils/logger");
const pythonProcessManager = require("../src/utils/pythonProcessManager");

const sampleDocuments = [
    {
        content:
            "Link building is a crucial SEO strategy that involves acquiring high-quality backlinks from authoritative websites to improve search engine rankings and domain authority. Effective link building requires outreach, content creation, and relationship building with other website owners.",
        meta: {
            topic: "Link Building",
            category: "SEO Strategy",
            source: "seed_data",
        },
    },
    {
        content:
            "Domain Authority (DA) is a metric developed by Moz that predicts how well a website will rank on search engines. It ranges from 0 to 100, with higher scores indicating stronger ranking potential. DA is influenced by factors like backlink quality, content relevance, and site structure.",
        meta: {
            topic: "Domain Authority",
            category: "SEO Metrics",
            source: "seed_data",
        },
    },
    {
        content:
            "The Link Portfolio feature allows users to browse and purchase high-quality backlinks from verified publishers. Users can filter links by domain authority, price range, niche relevance, and anchor text type to find the most suitable opportunities for their SEO campaigns.",
        meta: {
            topic: "Link Portfolio",
            category: "Platform Features",
            source: "seed_data",
        },
    },
    {
        content:
            "Content creation is essential for successful link building campaigns. High-quality, engaging content that provides value to readers naturally attracts backlinks. This includes blog posts, infographics, case studies, and resource pages that establish your website as an authority in your niche.",
        meta: {
            topic: "Content Creation",
            category: "Link Building Tactics",
            source: "seed_data",
        },
    },
    {
        content:
            "Link monitoring and maintenance ensures that acquired backlinks remain active and continue to provide SEO value. Regular check-ups help identify broken links, redirect issues, or deindexed pages that may negatively impact your link profile and search rankings.",
        meta: {
            topic: "Link Monitoring",
            category: "SEO Maintenance",
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

        // Add sample documents to the knowledge base one by one
        logger.info(`Adding ${sampleDocuments.length} sample documents...`);

        let totalIndexed = 0;
        for (const doc of sampleDocuments) {
            const result = await pythonProcessManager.executeScript(
                "rag_chatbot",
                ["add_docs", doc.content]
            );

            if (result.error) {
                throw new Error(result.error);
            }

            totalIndexed += result.documents_indexed || 1;
            logger.info(`Added document: ${doc.meta.topic}`);
        }

        const result = { documents_indexed: totalIndexed, success: true };

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
        const testQuery = "What is link building?";
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
