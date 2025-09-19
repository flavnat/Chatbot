#!/usr/bin/env node

const fs = require("fs").promises;
const path = require("path");
const JSRAG = require("./js-rag");

async function loadLinkbuildersData() {
    try {
        const linkbuildersPath = path.join(
            __dirname,
            "../../data/linkbuilders.json"
        );

        const data = JSON.parse(await fs.readFile(linkbuildersPath, "utf-8"));

        console.log(`Loaded ${data.length} items from linkbuilders.json`);
        return data;
    } catch (error) {
        if (error.code === "ENOENT") {
            console.error("linkbuilders.json file not found");
        } else if (error.name === "SyntaxError") {
            console.error("Error parsing linkbuilders.json:", error.message);
        } else {
            console.error("Error loading linkbuilders.json:", error.message);
        }
        throw error;
    }
}

function prepareDocumentsForIndexing(data) {
    const documents = [];

    for (const item of data) {
        // Create a comprehensive content string
        const content = `Question: ${item.question || ""}\nAnswer: ${
            item.answer || ""
        }`;

        // Prepare metadata
        const meta = {
            source: "linkbuilders",
            category: item.category || "general",
            question: item.question || "",
            id: item.id || "",
            type: "qa_pair",
        };

        documents.push({
            content: content,
            meta: meta,
        });
    }

    console.log(`Prepared ${documents.length} documents for indexing`);
    return documents;
}

async function indexDocumentsWithJSRAG(documents) {
    try {
        const rag = new JSRAG();
        await rag.initialize();

        console.log(
            `Indexing ${documents.length} documents with JavaScript RAG...`
        );
        const result = await rag.indexDocuments(documents);

        return result;
    } catch (error) {
        console.error(
            "Error indexing documents with JavaScript RAG:",
            error.message
        );
        return {
            success: false,
            error: error.message,
        };
    }
}

async function main() {
    console.log("🚀 Starting JavaScript linkbuilders data indexing process...");

    try {
        // Load data from linkbuilders.json
        const data = await loadLinkbuildersData();

        // Prepare documents for indexing
        const documents = prepareDocumentsForIndexing(data);

        // Index documents using JavaScript RAG
        const result = await indexDocumentsWithJSRAG(documents);

        if (result.success) {
            console.log(
                `✅ Successfully indexed ${
                    result.documentsIndexed || 0
                } documents`
            );
            console.log(
                JSON.stringify(
                    {
                        success: true,
                        message: `Successfully indexed ${
                            result.documentsIndexed || 0
                        } documents from linkbuilders.json`,
                        documentsIndexed: result.documentsIndexed || 0,
                        implementation: "javascript",
                    },
                    null,
                    2
                )
            );
        } else {
            console.error(`❌ Failed to index documents: ${result.error}`);
            console.log(
                JSON.stringify(
                    {
                        success: false,
                        error: result.error,
                        implementation: "javascript",
                    },
                    null,
                    2
                )
            );
            process.exit(1);
        }
    } catch (error) {
        console.error(
            `❌ Error in JavaScript training process: ${error.message}`
        );
        console.log(
            JSON.stringify(
                {
                    success: false,
                    error: error.message,
                    implementation: "javascript",
                },
                null,
                2
            )
        );
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    loadLinkbuildersData,
    prepareDocumentsForIndexing,
    indexDocumentsWithJSRAG,
};
