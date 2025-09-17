const app = require("./src/app");
const config = require("./src/config");
const logger = require("./src/utils/logger");
const { connectDB } = require("./src/database/connection");

const port = config.PORT;

// Connect to database and start server
async function startServer() {
    try {
        // Connect to MongoDB
        await connectDB();
        logger.info("Connected to MongoDB successfully");

        // Start the server
        app.listen(port, () => {
            logger.info(`Server running on port ${port}`, {
                environment: config.NODE_ENV,
                corsOrigin: config.CORS_ORIGIN,
            });
            console.log(`🚀 Server running on http://localhost:${port}`);
            console.log(`📚 API Documentation: http://localhost:${port}/api`);
        });
    } catch (error) {
        logger.error("Failed to start server", { error: error.message });
        console.error("❌ Failed to start server:", error.message);
        process.exit(1);
    }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection at:", { reason, promise });
    console.error("❌ Unhandled Rejection:", reason);
    process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception:", {
        error: error.message,
        stack: error.stack,
    });
    console.error("❌ Uncaught Exception:", error.message);
    process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", async () => {
    logger.info("Received SIGINT, shutting down gracefully...");
    console.log("⏹️  Shutting down server...");
    process.exit(0);
});

process.on("SIGTERM", async () => {
    logger.info("Received SIGTERM, shutting down gracefully...");
    console.log("⏹️  Shutting down server...");
    process.exit(0);
});

// Start the server
startServer();
