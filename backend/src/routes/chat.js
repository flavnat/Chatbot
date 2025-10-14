const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { body, validationResult } = require("express-validator");
const fs = require("fs").promises;
const path = require("path");
const pythonProcessManager = require("../utils/pythonProcessManager");
const logger = require("../utils/logger");
const { ChatMessage, ChatSession, UserSession, User } = require("../models");
const { sanitizeForVectorDB } = require("../utils/textSanitizer");

// Import new utilities
const QueryCache = require("../utils/query-cache");
const RateLimiter = require("../utils/rate-limiter");
const ConversationTemplates = require("../utils/conversation-templates");
const JSTrainer = require("../utils/js-trainer");
const JSRAGChatbot = require("../utils/js-rag-chatbot");

// Initialize utilities
const queryCache = new QueryCache();
const rateLimiter = new RateLimiter();
const conversationTemplates = new ConversationTemplates();

// Test route for debugging
router.get("/test", (req, res) => {
   res.json({ success: true, message: "Chat routes are working" });
});

// Debug route to check database connection and messages
router.get("/debug/messages", async (req, res) => {
   try {
      const limit = parseInt(req.query.limit) || 10;

      const messages = await ChatMessage.find({}).sort({ timestamp: -1 }).limit(limit).lean();

      const sessions = await ChatSession.find({}).sort({ updatedAt: -1 }).limit(5).lean();

      // Check MongoDB connection
      const dbState = mongoose.connection.readyState;
      const dbStates = {
         0: "disconnected",
         1: "connected",
         2: "connecting",
         3: "disconnecting",
      };

      res.json({
         success: true,
         database: {
            state: dbStates[dbState],
            name: mongoose.connection.name,
            host: mongoose.connection.host,
         },
         messages: messages.map((msg) => ({
            id: msg._id,
            sessionId: msg.sessionId,
            role: msg.role,
            message: msg.message,
            response: msg.response,
            timestamp: msg.timestamp,
            metadata: msg.metadata,
         })),
         sessions: sessions.map((sess) => ({
            id: sess._id,
            sessionId: sess.sessionId,
            title: sess.title,
            messageCount: sess.messageCount,
            lastActivity: sess.lastActivity,
            createdAt: sess.createdAt,
         })),
         totalMessages: await ChatMessage.countDocuments({}),
         totalSessions: await ChatSession.countDocuments(),
      });
   } catch (error) {
      logger.error("Debug route error:", error);
      res.status(500).json({
         success: false,
         error: error.message,
         stack: error.stack,
      });
   }
});

// Debug route to check messages for a specific session
router.get("/debug/messages/:sessionId", async (req, res) => {
   try {
      const { sessionId } = req.params;
      const limit = parseInt(req.query.limit) || 10;

      const messages = await ChatMessage.find({ sessionId }).sort({ timestamp: -1 }).limit(limit).lean();

      const sessions = await ChatSession.find({}).sort({ updatedAt: -1 }).limit(5).lean();

      // Check MongoDB connection
      const dbState = mongoose.connection.readyState;
      const dbStates = {
         0: "disconnected",
         1: "connected",
         2: "connecting",
         3: "disconnecting",
      };

      res.json({
         success: true,
         database: {
            state: dbStates[dbState] || "unknown",
            name: mongoose.connection.name,
            host: mongoose.connection.host,
         },
         messages: messages.map((msg) => ({
            id: msg._id,
            sessionId: msg.sessionId,
            role: msg.role,
            message: msg.message,
            response: msg.response,
            timestamp: msg.timestamp,
            metadata: msg.metadata,
         })),
         sessions: sessions.map((sess) => ({
            id: sess._id,
            sessionId: sess.sessionId,
            title: sess.title,
            messageCount: sess.messageCount,
            lastActivity: sess.lastActivity,
            createdAt: sess.createdAt,
         })),
         totalMessages: await ChatMessage.countDocuments({ sessionId }),
         totalSessions: await ChatSession.countDocuments(),
      });
   } catch (error) {
      logger.error("Debug route error:", error);
      res.status(500).json({
         success: false,
         error: error.message,
         stack: error.stack,
      });
   }
});

// Manual test route to save a message
router.post("/test-save", async (req, res) => {
   try {
      const { sessionId, message, role = "user" } = req.body;

      if (!sessionId || !message) {
         return res.status(400).json({
            success: false,
            error: "sessionId and message are required",
         });
      }

      // Create test message
      const testMessage = new ChatMessage({
         sessionId,
         role,
         message: role === "user" ? message : undefined,
         response: role === "assistant" ? message : undefined,
         timestamp: new Date(),
      });

      await testMessage.save();

      // Also create/update session
      let session = await ChatSession.findOne({ sessionId });
      if (!session) {
         session = new ChatSession({
            sessionId,
            title: `Test Session - ${new Date().toISOString()}`,
            messageCount: 0,
            lastActivity: new Date(),
         });
      }
      session.messageCount += 1;
      session.lastActivity = new Date();
      await session.save();

      res.json({
         success: true,
         message: "Test message saved successfully",
         messageId: testMessage._id,
         sessionId: session.sessionId,
      });
   } catch (error) {
      logger.error("Test save error:", error);
      res.status(500).json({
         success: false,
         error: error.message,
         stack: error.stack,
      });
   }
});

/**
 * POST /api/chat/message
 * Send a chat message and get AI response
 */
router.post(
   "/message",
   [
      // Auth middleware
      async (req, res, next) => {
         try {
            const sessionKey = req.headers["x-session-key"];

            if (!sessionKey) {
               return res.status(401).json({
                  success: false,
                  error: "Authentication required. Please log in.",
               });
            }

            const userSession = await UserSession.findOne({
               sessionKey,
               isActive: true,
               expiresAt: { $gt: new Date() },
            }).populate("userId");

            if (!userSession) {
               return res.status(401).json({
                  success: false,
                  error: "Invalid or expired session. Please log in again.",
               });
            }

            req.user = userSession.userId;
            next();
         } catch (error) {
            logger.error("Auth middleware error", error);
            res.status(500).json({
               success: false,
               error: "Authentication check failed",
            });
         }
      },
      // Usage limit middleware
      async (req, res, next) => {
         try {
            const currentMonth = new Date().toISOString().slice(0, 7);

            if (req.user.monthlyUsage.month !== currentMonth) {
               // Reset usage for new month
               req.user.monthlyUsage.month = currentMonth;
               req.user.monthlyUsage.questionsAsked = 0;
               await req.user.save();
            }

            if (req.user.monthlyUsage.questionsAsked >= req.user.monthlyUsage.limit) {
               return res.status(429).json({
                  success: false,
                  error: "Monthly question limit reached. Please contact the support team at linkbuilders.support@gmail.com",
                  limitReached: true,
               });
            }

            next();
         } catch (error) {
            logger.error("Usage check error", error);
            res.status(500).json({
               success: false,
               error: "Usage check failed",
            });
         }
      },
      // Rate limiting middleware
      (req, res, next) => {
         const clientIP = req.ip || req.connection.remoteAddress || "unknown";
         const rateLimitResult = rateLimiter.checkLimit(clientIP);

         if (!rateLimitResult.allowed) {
            return res.status(429).json({
               success: false,
               error: rateLimitResult.reason,
               retryAfter: rateLimitResult.remainingTime,
            });
         }

         // Add rate limit info to response headers
         res.set({
            "X-RateLimit-Remaining": rateLimitResult.remainingRequests,
            "X-RateLimit-Reset": rateLimitResult.resetTime,
         });

         next();
      },
      // Input validation
      body("message").isLength({ min: 1, max: 2000 }).withMessage("Message must be 1-2000 characters"),
      body("sessionId").optional().isString().withMessage("Session ID must be a string"),
      body("provider").optional().isIn(["gemini", "openai", "deepseek"]).withMessage("Invalid provider"),
      body("useRag").optional().isBoolean().withMessage("useRag must be a boolean"),
      body("topK").optional().isInt({ min: 1, max: 10 }).withMessage("topK must be between 1 and 10"),
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
            const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            session = new ChatSession({
               sessionId: newSessionId,
               userId: req.user._id.toString(),
               title: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
               messageCount: 0,
               lastActivity: new Date(),
            });

            try {
               await session.save();
               logger.info("New chat session created", {
                  sessionId: newSessionId,
               });
            } catch (dbError) {
               logger.error("Failed to create chat session", {
                  error: dbError.message,
                  sessionId: newSessionId,
               });
               return res.status(500).json({
                  success: false,
                  error: "Failed to create chat session",
               });
            }
         }

         // Save user message
         const userMessage = new ChatMessage({
            sessionId: session.sessionId,
            userId: req.user._id.toString(),
            role: "user",
            message: message,
            timestamp: new Date(),
         });

         try {
            await userMessage.save();
            logger.info("User message saved to database", {
               sessionId: session.sessionId,
               messageId: userMessage._id,
            });
         } catch (dbError) {
            logger.error("Failed to save user message to database", {
               error: dbError.message,
               sessionId: session.sessionId,
            });
            // Continue execution even if DB save fails
         }

         // Update session
         session.messageCount += 1;
         session.lastActivity = new Date();

         try {
            await session.save();
            logger.info("Session updated after user message", {
               sessionId: session.sessionId,
               messageCount: session.messageCount,
            });
         } catch (dbError) {
            logger.error("Failed to update session after user message", {
               error: dbError.message,
               sessionId: session.sessionId,
            });
         }

         let aiResult;

         // Check cache first
         const cachedResult = queryCache.get(message, provider, useRag, topK);
         if (cachedResult) {
            logger.info("Using cached response", {
               cacheHits: cachedResult.cacheHits,
               cacheAge: cachedResult.cacheAge,
            });
            aiResult = {
               ...cachedResult,
               implementation: implementation,
               cached: true,
            };
         } else {
            // Generate new response
            if (implementation === "javascript") {
               // Use new Conversational Chatbot
               const ConversationalChatbot = require("../utils/conversational-chatbot");
               const conversationalChatbot = new ConversationalChatbot();

               aiResult = await conversationalChatbot.generateResponse(
                  message,
                  session.sessionId,
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
               const pythonArgs = ["chat", message, session.sessionId, provider, useRag.toString(), topK.toString()];

               aiResult = await pythonProcessManager.executeScript("rag_chatbot", pythonArgs);
               aiResult.implementation = "python";

               if (aiResult.error) {
                  throw new Error(aiResult.error);
               }
            }

            // Cache the result
            queryCache.set(message, provider, useRag, topK, aiResult);
         }

         // Save AI response
         const aiMessage = new ChatMessage({
            sessionId: session.sessionId,
            userId: req.user._id.toString(),
            role: "assistant",
            response: aiResult.response,
            metadata: {
               provider: aiResult.provider,
               model: aiResult.model,
               usage: aiResult.usage,
               ragUsed: aiResult.ragUsed !== undefined ? aiResult.ragUsed : aiResult.rag_used,
               contextDocuments:
                  aiResult.contextDocuments !== undefined ? aiResult.contextDocuments : aiResult.context_documents,
               implementation: aiResult.implementation,
            },
            timestamp: new Date(),
         });

         try {
            await aiMessage.save();
            logger.info("AI message saved to database", {
               sessionId: session.sessionId,
               messageId: aiMessage._id,
               provider: aiResult.provider,
            });

            // Increment monthly usage
            req.user.monthlyUsage.questionsAsked += 1;
            await req.user.save();
         } catch (dbError) {
            logger.error("Failed to save AI message to database", {
               error: dbError.message,
               sessionId: session.sessionId,
               provider: aiResult.provider,
            });
            // Continue execution even if DB save fails
         }

         // Update session message count
         session.messageCount += 1;
         session.lastActivity = new Date();

         try {
            await session.save();
            logger.info("Session updated after AI response", {
               sessionId: session.sessionId,
               messageCount: session.messageCount,
            });
         } catch (dbError) {
            logger.error("Failed to update session after AI response", {
               error: dbError.message,
               sessionId: session.sessionId,
            });
         }

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
            relatedQuestions: aiResult.relatedQuestions || [],
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



 * PUT /api/chat/userreaction/:messageId


 * Update the reaction (like or dislike) for a chat message.


 */

router.put("/userreaction/:messageId", async (req, res) => {
   try {
      const { messageId } = req.params;
      const { userReaction } = req.body;

      if (!messageId) {
         return res.status(404).json({
            success: false,
            error: "Message Id is not found",
         });
      }

      const updateMessage = await ChatMessage.findByIdAndUpdate(messageId, { userReaction }, { new: true });
      res.status(200).json(updateMessage);
   } catch (error) {
      logger.error("Error update message reaction", { error: error.message });
      res.status(500).json({
         success: false,
         error: "Failed to update message reaction",
      });
   }
});

/**
 * GET /api/chat/sessions
 * Get all chat sessions for the user
 */
router.get("/sessions", async (req, res) => {
   try {
      const sessions = await ChatSession.find().sort({ lastActivity: -1 }).limit(50);

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
      const { implementation = "javascript" } = req.query;
      const linkbuildersPath = path.join(__dirname, "../../data/linkbuilders.json");

      logger.info("Starting automatic document training process (GET request)", { implementation });

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
         logger.warn("Could not read existing linkbuilders.json, starting fresh", { error: error.message });
         existingData = [];
      }

      // Step 3: Filter out existing chat_generated documents to avoid duplicates
      const existingChatDocs = existingData.filter((doc) => doc.category === "chat_generated");
      const existingQuestions = new Set(existingChatDocs.map((doc) => doc.question));

      // Step 4: Add only new chat documents
      const newChatDocuments = sanitizedDocuments.filter((doc) => !existingQuestions.has(doc.question));

      logger.info(`Adding ${newChatDocuments.length} new chat documents`);

      // Step 5: Combine existing data with new chat documents
      const updatedData = [...existingData, ...newChatDocuments];

      // Step 6: Write updated data to linkbuilders.json
      await fs.writeFile(linkbuildersPath, JSON.stringify(updatedData, null, 4));

      logger.info("Updated linkbuilders.json", {
         totalDocuments: updatedData.length,
         newChatDocuments: newChatDocuments.length,
         existingDocuments: existingData.length,
      });

      // Step 7: Trigger the trainer script based on implementation
      let trainerResult;
      if (implementation === "javascript") {
         logger.info("Using JavaScript trainer for document indexing");
         trainerResult = await JSTrainer.indexDocumentsWithJSRAG(JSTrainer.prepareDocumentsForIndexing(updatedData));
         trainerResult.implementation = "javascript";
      } else {
         logger.info("Using Python trainer for document indexing");
         trainerResult = await pythonProcessManager.executeScript("trainer", []);
         trainerResult.implementation = "python";
      }

      if (trainerResult.error || !trainerResult.success) {
         throw new Error(`Trainer failed: ${trainerResult.error || "Unknown error"}`);
      }

      res.json({
         success: true,
         message: "Chat documents added and training completed (responses sanitized for vector DB) - GET request",
         documentsProcessed: sanitizedDocuments.length,
         newDocumentsAdded: newChatDocuments.length,
         totalDocuments: updatedData.length,
         trainerResult: trainerResult,
         implementation: implementation,
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
      const { implementation = "python" } = req.body;
      const linkbuildersPath = path.join(__dirname, "../../data/linkbuilders.json");

      logger.info("Starting automatic document training process", {
         implementation,
      });

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
         logger.warn("Could not read existing linkbuilders.json, starting fresh", { error: error.message });
         existingData = [];
      }

      // Step 3: Filter out existing chat_generated documents to avoid duplicates
      const existingChatDocs = existingData.filter((doc) => doc.category === "chat_generated");
      const existingQuestions = new Set(existingChatDocs.map((doc) => doc.question));

      // Step 4: Add only new chat documents
      const newChatDocuments = sanitizedDocuments.filter((doc) => !existingQuestions.has(doc.question));

      logger.info(`Adding ${newChatDocuments.length} new chat documents`);

      // Step 5: Combine existing data with new chat documents
      const updatedData = [...existingData, ...newChatDocuments];

      // Step 6: Write updated data to linkbuilders.json
      await fs.writeFile(linkbuildersPath, JSON.stringify(updatedData, null, 4));

      logger.info("Updated linkbuilders.json", {
         totalDocuments: updatedData.length,
         newChatDocuments: newChatDocuments.length,
         existingDocuments: existingData.length,
      });

      // Step 7: Trigger the trainer script based on implementation
      let trainerResult;
      if (implementation === "javascript") {
         logger.info("Using JavaScript trainer for document indexing");
         trainerResult = await JSTrainer.indexDocumentsWithJSRAG(JSTrainer.prepareDocumentsForIndexing(updatedData));
         trainerResult.implementation = "javascript";
      } else {
         logger.info("Using Python trainer for document indexing");
         trainerResult = await pythonProcessManager.executeScript("trainer", []);
         trainerResult.implementation = "python";
      }

      if (trainerResult.error || !trainerResult.success) {
         throw new Error(`Trainer failed: ${trainerResult.error || "Unknown error"}`);
      }

      res.json({
         success: true,
         message: "Chat documents added and training completed (responses sanitized for vector DB)",
         documentsProcessed: sanitizedDocuments.length,
         newDocumentsAdded: newChatDocuments.length,
         totalDocuments: updatedData.length,
         trainerResult: trainerResult,
         implementation: implementation,
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
      const { implementation = "python" } = req.query;

      let statsResult;
      if (implementation === "javascript") {
         logger.info("Getting stats using JavaScript implementation");
         const jsChatbot = new JSRAGChatbot();
         statsResult = await jsChatbot.getStats();
         if (!statsResult.success) {
            throw new Error(statsResult.error || "Failed to get JavaScript stats");
         }
         statsResult.implementation = "javascript";
      } else {
         logger.info("Getting stats using Python implementation");
         statsResult = await pythonProcessManager.executeScript("rag_chatbot", ["stats"]);
         if (statsResult.error) {
            throw new Error(statsResult.error);
         }
         statsResult.implementation = "python";
      }

      // Get database stats
      const totalSessions = await ChatSession.countDocuments();
      const totalMessages = await ChatMessage.countDocuments();

      res.json({
         success: true,
         stats: {
            ...statsResult,
            totalSessions,
            totalMessages,
            implementation: implementation,
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

/**
 * GET /api/chat/templates
 * Get all conversation templates
 */
router.get("/templates", async (req, res) => {
   try {
      const templates = conversationTemplates.getAllTemplates();
      res.json({
         success: true,
         templates,
      });
   } catch (error) {
      logger.error("Error fetching templates", { error: error.message });
      res.status(500).json({
         success: false,
         error: "Failed to fetch conversation templates",
      });
   }
});

/**
 * POST /api/chat/templates
 * Create a new conversation template
 */
router.post(
   "/templates",
   [
      body("name").isLength({ min: 1, max: 100 }).withMessage("Name is required"),
      body("description").optional().isLength({ max: 500 }),
      body("category").isIn(["general", "support", "sales", "technical"]).withMessage("Invalid category"),
      body("messages").isArray({ min: 1 }).withMessage("At least one message required"),
   ],
   async (req, res) => {
      try {
         const errors = validationResult(req);
         if (!errors.isEmpty()) {
            return res.status(400).json({
               success: false,
               errors: errors.array(),
            });
         }

         const template = await conversationTemplates.createTemplate(req.body);
         res.json({
            success: true,
            template,
         });
      } catch (error) {
         logger.error("Error creating template", { error: error.message });
         res.status(500).json({
            success: false,
            error: "Failed to create conversation template",
         });
      }
   }
);

/**
 * GET /api/chat/cache/stats
 * Get cache statistics
 */
router.get("/cache/stats", async (req, res) => {
   try {
      const stats = queryCache.getStats();
      res.json({
         success: true,
         cache: stats,
      });
   } catch (error) {
      logger.error("Error fetching cache stats", { error: error.message });
      res.status(500).json({
         success: false,
         error: "Failed to fetch cache statistics",
      });
   }
});

/**
 * GET /api/chat/rate-limit/stats
 * Get rate limiting statistics
 */
router.get("/rate-limit/stats", async (req, res) => {
   try {
      const stats = rateLimiter.getStats();
      res.json({
         success: true,
         rateLimit: stats,
      });
   } catch (error) {
      logger.error("Error fetching rate limit stats", {
         error: error.message,
      });
      res.status(500).json({
         success: false,
         error: "Failed to fetch rate limit statistics",
      });
   }
});

module.exports = router;
