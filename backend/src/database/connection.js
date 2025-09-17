const mongoose = require("mongoose");
const logger = require("../utils/logger");
const config = require("../config");

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(config.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        logger.info(`MongoDB Connected: ${conn.connection.host}`);

        // Handle connection events
        mongoose.connection.on("error", (err) => {
            logger.error("MongoDB connection error:", err);
        });

        mongoose.connection.on("disconnected", () => {
            logger.warn("MongoDB disconnected");
        });

        mongoose.connection.on("reconnected", () => {
            logger.info("MongoDB reconnected");
        });
    } catch (error) {
        logger.error("MongoDB connection failed:", error);
        process.exit(1);
    }
};

module.exports = { connectDB };
