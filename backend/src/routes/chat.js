const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const fs = require("fs").promises;
const path = require("path");
const pythonProcessManager = require("../utils/pythonProcessManager");
const logger = require("../utils/logger");
const { ChatMessage, ChatSession } = require("../models");
const { sanitizeForVectorDB } = require("../utils/textSanitizer");

// Test route for debugging
router.get("/test", (req, res) => {
    res.json({ success: true, message: "Chat routes are working" });
});

/**
 * POST /api/chat/message
 * Send a chat message and get AI response
 */
router.post(
    "/message",
    [
        body("message")
            .isLength({ min: 1, max: 2000 })
            .withMessage("Message must be 1-2000 characters"),
        body("sessionId")
            .optional()
            .isString()
            .withMessage("Session ID must be a string"),
        body("provider")
            .optional()
            .isIn(["gemini", "openai", "deepseek"])
            .withMessage("Invalid provider"),
        body("useRag")
            .optional()
            .isBoolean()
            .withMessage("useRag must be a boolean"),
        body("topK")
            .optional()
            .isInt({ min: 1, max: 10 })
            .withMessage("topK must be between 1 and 10"),
        body("implementation")
            .optional()
            .isIn(["python", "javascript"])
            .withMessage("Implementation must be 'python' or 'javascript'"),
    ],
    async (req, res) => {
        try {
            // Check validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array(),
                });
            }

            const {
                message,
                sessionId,
                provider = "gemini",
                useRag = true,
                topK = 3,
                implementation = "javascript",
            } = req.body;

            logger.info("Processing chat message", {
                sessionId,
                provider,
                useRag,
                implementation,
                messageLength: message.length,
            });

            // Find or create chat session
            let session;
            if (sessionId) {
                session = await ChatSession.findOne({ sessionId: sessionId });
                if (!session) {
                    return res.status(404).json({
                        success: false,
                        error: "Chat session not found",
                    });
                }
            } else {
                // Generate a unique session ID
                const newSessionId = `session_${Date.now()}_${Math.random()
                    .toString(36)
                    .substr(2, 9)}`;
                session = new ChatSession({
                    sessionId: newSessionId,
                    title:
                        message.substring(0, 50) +
                        (message.length > 50 ? "..." : ""),
                    messageCount: 0,
                    lastActivity: new Date(),
                });
                await session.save();
            }

            // Save user message
            const userMessage = new ChatMessage({
                sessionId: session.sessionId,
                role: "user",
                message: message,
                timestamp: new Date(),
            });
            await userMessage.save();

            // Update session
            session.messageCount += 1;
            session.lastActivity = new Date();
            await session.save();

            let aiResult;

            // Choose implementation based on parameter
            if (implementation === "javascript") {
                // Use JavaScript RAG implementation
                const JSRAGChatbot = require("../utils/js-rag-chatbot");
                const jsChatbot = new JSRAGChatbot();

                aiResult = await jsChatbot.generateResponse(
                    message,
                    provider,
                    useRag,
                    topK
                );
                aiResult.implementation = "javascript";

                if (aiResult.error) {
                    throw new Error(aiResult.error);
                }
            } else {
                // Use Python RAG implementation (default)
                const pythonArgs = [
                    "chat",
                    message,
                    provider,
                    useRag.toString(),
                    topK.toString(),
                ];

                aiResult = await pythonProcessManager.executeScript(
                    "rag_chatbot",
                    pythonArgs
                );
                aiResult.implementation = "python";

                if (aiResult.error) {
                    throw new Error(aiResult.error);
                }
            }

            // Save AI response
            const aiMessage = new ChatMessage({
                sessionId: session.sessionId,
                role: "assistant",
                response: aiResult.response,
                metadata: {
                    provider: aiResult.provider,
                    model: aiResult.model,
                    usage: aiResult.usage,
                    ragUsed:
                        aiResult.ragUsed !== undefined
                            ? aiResult.ragUsed
                            : aiResult.rag_used,
                    contextDocuments:
                        aiResult.contextDocuments !== undefined
                            ? aiResult.contextDocuments
                            : aiResult.context_documents,
                    implementation: aiResult.implementation,
                },
                timestamp: new Date(),
            });
            await aiMessage.save();

            // Update session message count
            session.messageCount += 1;
            await session.save();

            // Return response
            res.json({
                success: true,
                sessionId: session.sessionId,
                message: {
                    id: aiMessage._id,
                    role: aiMessage.role,
                    content: aiMessage.response,
                    timestamp: aiMessage.timestamp,
                    metadata: aiMessage.metadata,
                },
                usage: aiResult.usage,
            });
        } catch (error) {
            logger.error("Error processing chat message", {
                error: error.message,
            });
            res.status(500).json({
                success: false,
                error: "Failed to process chat message",
                details: error.message,
            });
        }
    }
);

/**
 * GET /api/chat/sessions
 * Get all chat sessions for the user
 */
router.get("/sessions", async (req, res) => {
    try {
        const sessions = await ChatSession.find()
            .sort({ lastActivity: -1 })
            .limit(50);

        res.json({
            success: true,
            sessions: sessions.map((session) => ({
                id: session._id,
                title: session.title,
                messageCount: session.messageCount,
                createdAt: session.createdAt,
                lastActivity: session.lastActivity,
            })),
        });
    } catch (error) {
        logger.error("Error fetching chat sessions", { error: error.message });
        res.status(500).json({
            success: false,
            error: "Failed to fetch chat sessions",
        });
    }
});

/**
 * GET /api/chat/sessions/:sessionId/messages
 * Get messages for a specific chat session
 */
router.get("/sessions/:sessionId/messages", async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        // Verify session exists
        const session = await ChatSession.findOne({ sessionId: sessionId });
        if (!session) {
            return res.status(404).json({
                success: false,
                error: "Chat session not found",
            });
        }

        // Get messages
        const messages = await ChatMessage.find({ sessionId })
            .sort({ timestamp: 1 })
            .limit(parseInt(limit))
            .skip(parseInt(offset));

        res.json({
            success: true,
            session: {
                id: session._id,
                title: session.title,
                messageCount: session.messageCount,
            },
            messages: messages.map((message) => ({
                id: message._id,
                role: message.role,
                content: message.content,
                timestamp: message.timestamp,
                metadata: message.metadata,
            })),
        });
    } catch (error) {
        logger.error("Error fetching session messages", {
            error: error.message,
        });
        res.status(500).json({
            success: false,
            error: "Failed to fetch session messages",
        });
    }
});

/**
 * DELETE /api/chat/sessions/:sessionId
 * Delete a chat session and all its messages
 */
router.delete("/sessions/:sessionId", async (req, res) => {
    try {
        const { sessionId } = req.params;

        // Delete session and messages
        await ChatSession.findOneAndDelete({ sessionId: sessionId });
        await ChatMessage.deleteMany({ sessionId });

        res.json({
            success: true,
            message: "Chat session deleted successfully",
        });
    } catch (error) {
        logger.error("Error deleting chat session", { error: error.message });
        res.status(500).json({
            success: false,
            error: "Failed to delete chat session",
        });
    }
});

/**
 * GET /api/chat/documents
 * Get all documents in knowledge base format (linkbuilders.json style)
 */
router.get("/documents", async (req, res) => {
    try {
        // Get all user messages and their corresponding AI responses
        const userMessages = await ChatMessage.find({ role: "user" }).sort({
            timestamp: 1,
        });

        const documents = [];

        for (const userMsg of userMessages) {
            // Find the corresponding AI response (next message in same session)
            const aiResponse = await ChatMessage.findOne({
                sessionId: userMsg.sessionId,
                role: "assistant",
                timestamp: { $gt: userMsg.timestamp },
            }).sort({ timestamp: 1 });

            if (aiResponse && aiResponse.response) {
                documents.push({
                    question: userMsg.message,
                    answer: aiResponse.response,
                    category: "chat_generated",
                    sessionId: userMsg.sessionId,
                    timestamp: userMsg.timestamp,
                });
            }
        }

        res.json({
            success: true,
            documents: documents,
            totalDocuments: documents.length,
        });
    } catch (error) {
        logger.error("Error fetching documents", { error: error.message });
        res.status(500).json({
            success: false,
            error: "Failed to fetch documents",
        });
    }
});

/**
 * GET /api/chat/documents/train
 * Automatically fetch chat-generated documents and update linkbuilders.json (browser accessible)
 */
router.get("/documents/train", async (req, res) => {
    try {
        const linkbuildersPath = path.join(
            __dirname,
            "../../data/linkbuilders.json"
        );

        logger.info(
            "Starting automatic document training process (GET request)"
        );

        // Step 1: Get all chat-generated documents
        const userMessages = await ChatMessage.find({ role: "user" }).sort({
            timestamp: 1,
        });

        const chatDocuments = [];
        for (const userMsg of userMessages) {
            // Find the corresponding AI response
            const aiResponse = await ChatMessage.findOne({
                sessionId: userMsg.sessionId,
                role: "assistant",
                timestamp: { $gt: userMsg.timestamp },
            }).sort({ timestamp: 1 });

            if (aiResponse && aiResponse.response) {
                chatDocuments.push({
                    question: userMsg.message,
                    answer: aiResponse.response,
                    category: "chat_generated",
                    sessionId: userMsg.sessionId,
                    timestamp: userMsg.timestamp,
                });
            }
        }

        logger.info(`Found ${chatDocuments.length} chat-generated documents`);

        // Sanitize AI responses for vector database storage
        const sanitizedDocuments = chatDocuments.map((doc) => ({
            ...doc,
            answer: sanitizeForVectorDB(doc.answer),
        }));

        logger.info("Sanitized markdown formatting from AI responses");

        // Step 2: Read existing linkbuilders.json
        let existingData = [];
        try {
            const existingContent = await fs.readFile(linkbuildersPath, "utf8");
            existingData = JSON.parse(existingContent);
        } catch (error) {
            logger.warn(
                "Could not read existing linkbuilders.json, starting fresh",
                { error: error.message }
            );
            existingData = [];
        }

        // Step 3: Filter out existing chat_generated documents to avoid duplicates
        const existingChatDocs = existingData.filter(
            (doc) => doc.category === "chat_generated"
        );
        const existingQuestions = new Set(
            existingChatDocs.map((doc) => doc.question)
        );

        // Step 4: Add only new chat documents
        const newChatDocuments = sanitizedDocuments.filter(
            (doc) => !existingQuestions.has(doc.question)
        );

        logger.info(`Adding ${newChatDocuments.length} new chat documents`);

        // Step 5: Combine existing data with new chat documents
        const updatedData = [...existingData, ...newChatDocuments];

        // Step 6: Write updated data to linkbuilders.json
        await fs.writeFile(
            linkbuildersPath,
            JSON.stringify(updatedData, null, 4)
        );

        logger.info("Updated linkbuilders.json", {
            totalDocuments: updatedData.length,
            newChatDocuments: newChatDocuments.length,
            existingDocuments: existingData.length,
        });

        // Step 7: Trigger the trainer script
        const trainerResult = await pythonProcessManager.executeScript(
            "trainer",
            []
        );

        if (trainerResult.error) {
            throw new Error(`Trainer failed: ${trainerResult.error}`);
        }

        res.json({
            success: true,
            message:
                "Chat documents added and training completed (responses sanitized for vector DB) - GET request",
            documentsProcessed: sanitizedDocuments.length,
            newDocumentsAdded: newChatDocuments.length,
            totalDocuments: updatedData.length,
            trainerResult: trainerResult,
        });
    } catch (error) {
        logger.error("Error in automatic training process (GET)", {
            error: error.message,
        });
        res.status(500).json({
            success: false,
            error: "Failed to train with chat documents",
            details: error.message,
        });
    }
});

/**
 * POST /api/chat/documents/train
 * Automatically fetch chat-generated documents and update linkbuilders.json
 */
router.post("/documents/train", async (req, res) => {
    try {
        const linkbuildersPath = path.join(
            __dirname,
            "../../data/linkbuilders.json"
        );

        logger.info("Starting automatic document training process");

        // Step 1: Get all chat-generated documents
        const userMessages = await ChatMessage.find({ role: "user" }).sort({
            timestamp: 1,
        });

        const chatDocuments = [];
        for (const userMsg of userMessages) {
            // Find the corresponding AI response
            const aiResponse = await ChatMessage.findOne({
                sessionId: userMsg.sessionId,
                role: "assistant",
                timestamp: { $gt: userMsg.timestamp },
            }).sort({ timestamp: 1 });

            if (aiResponse && aiResponse.response) {
                chatDocuments.push({
                    question: userMsg.message,
                    answer: aiResponse.response,
                    category: "chat_generated",
                    sessionId: userMsg.sessionId,
                    timestamp: userMsg.timestamp,
                });
            }
        }

        logger.info(`Found ${chatDocuments.length} chat-generated documents`);

        // Sanitize AI responses for vector database storage
        const sanitizedDocuments = chatDocuments.map((doc) => ({
            ...doc,
            answer: sanitizeForVectorDB(doc.answer),
        }));

        logger.info("Sanitized markdown formatting from AI responses");

        // Step 2: Read existing linkbuilders.json
        let existingData = [];
        try {
            const existingContent = await fs.readFile(linkbuildersPath, "utf8");
            existingData = JSON.parse(existingContent);
        } catch (error) {
            logger.warn(
                "Could not read existing linkbuilders.json, starting fresh",
                { error: error.message }
            );
            existingData = [];
        }

        // Step 3: Filter out existing chat_generated documents to avoid duplicates
        const existingChatDocs = existingData.filter(
            (doc) => doc.category === "chat_generated"
        );
        const existingQuestions = new Set(
            existingChatDocs.map((doc) => doc.question)
        );

        // Step 4: Add only new chat documents
        const newChatDocuments = sanitizedDocuments.filter(
            (doc) => !existingQuestions.has(doc.question)
        );

        logger.info(`Adding ${newChatDocuments.length} new chat documents`);

        // Step 5: Combine existing data with new chat documents
        const updatedData = [...existingData, ...newChatDocuments];

        // Step 6: Write updated data to linkbuilders.json
        await fs.writeFile(
            linkbuildersPath,
            JSON.stringify(updatedData, null, 4)
        );

        logger.info("Updated linkbuilders.json", {
            totalDocuments: updatedData.length,
            newChatDocuments: newChatDocuments.length,
            existingDocuments: existingData.length,
        });

        // Step 7: Trigger the trainer script
        const trainerResult = await pythonProcessManager.executeScript(
            "trainer",
            []
        );

        if (trainerResult.error) {
            throw new Error(`Trainer failed: ${trainerResult.error}`);
        }

        res.json({
            success: true,
            message:
                "Chat documents added and training completed (responses sanitized for vector DB)",
            documentsProcessed: sanitizedDocuments.length,
            newDocumentsAdded: newChatDocuments.length,
            totalDocuments: updatedData.length,
            trainerResult: trainerResult,
        });
    } catch (error) {
        logger.error("Error in automatic training process", {
            error: error.message,
        });
        res.status(500).json({
            success: false,
            error: "Failed to train with chat documents",
            details: error.message,
        });
    }
});

/**
 * GET /api/chat/stats
 * Get chatbot statistics
 */
router.get("/stats", async (req, res) => {
    try {
        const pythonResult = await pythonProcessManager.executeScript(
            "rag_chatbot",
            ["stats"]
        );

        if (pythonResult.error) {
            throw new Error(pythonResult.error);
        }

        // Get database stats
        const totalSessions = await ChatSession.countDocuments();
        const totalMessages = await ChatMessage.countDocuments();

        res.json({
            success: true,
            stats: {
                ...pythonResult,
                totalSessions,
                totalMessages,
            },
        });
    } catch (error) {
        logger.error("Error fetching chatbot stats", { error: error.message });
        res.status(500).json({
            success: false,
            error: "Failed to fetch chatbot statistics",
        });
    }
});

module.exports = router;
