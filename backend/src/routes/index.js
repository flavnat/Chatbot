const express = require("express");
const router = express.Router();

// Import route modules
const chatRoutes = require("./chat");
const authRoutes = require("./auth");

// Mount routes
router.use("/chat", chatRoutes);
router.use("/auth", authRoutes);

// Health check endpoint
router.get("/health", (req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        service: "Chatbot API",
    });
});

// API info endpoint
router.get("/", (req, res) => {
    res.json({
        name: "Chatbot API",
        version: "1.0.0",
        description: "RAG-based chatbot API with multiple LLM providers",
        endpoints: {
            chat: "/api/chat",
            health: "/api/health",
        },
    });
});

module.exports = router;
