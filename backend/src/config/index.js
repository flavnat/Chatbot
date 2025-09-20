const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../.env") });

const config = {
    // Server Configuration
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: parseInt(process.env.PORT, 10) || 3000,

    // Database Configuration
    MONGODB_URI:
        process.env.MONGODB_URI || "mongodb://localhost:27017/chatboot_db",

    // API Keys
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    QDRANT_API_KEY: process.env.QDRANT_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,

    // Qdrant Configuration
    QDRANT_URL: process.env.QDRANT_URL,
    QDRANT_MODE: process.env.QDRANT_MODE || "local", // "local" or "cloud"
    QDRANT_COLLECTION_NAME:
        process.env.QDRANT_COLLECTION_NAME || "chatbot_documents",

    // Python Configuration
    PYTHON_PATH: process.env.PYTHON_PATH || "python3",
    PYTHON_SCRIPTS_PATH: path.join(__dirname, "../../python_scripts"),

    // Logging Configuration
    LOG_LEVEL: process.env.LOG_LEVEL || "info",
    LOG_FILE: process.env.LOG_FILE || "./logs/app.log",

    // Security Configuration
    JWT_SECRET:
        process.env.JWT_SECRET ||
        "9e51a09410cecd5f83dae5f805a8115968c34ece633821d2ac4470e327675436",
    RATE_LIMIT_WINDOW_MS:
        parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    RATE_LIMIT_MAX_REQUESTS:
        parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,

    // CORS Configuration
    CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",

    // Validation
    validate() {
        const required = [
            "GOOGLE_API_KEY",
            "OPENAI_API_KEY",
            "DEEPSEEK_API_KEY",
            "QDRANT_URL",
        ];

        // Only require QDRANT_API_KEY for cloud mode
        if (this.QDRANT_MODE === "cloud") {
            required.push("QDRANT_API_KEY");
        }

        const missing = required.filter((key) => !this[key]);

        if (missing.length > 0) {
            throw new Error(
                `Missing required environment variables: ${missing.join(", ")}`
            );
        }

        return this;
    },
};

module.exports = config;
