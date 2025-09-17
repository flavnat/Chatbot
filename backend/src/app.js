const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const routes = require("./routes");
const config = require("./config");
const logger = require("./utils/logger");

// Validate configuration
config.validate();

const app = express();

// Security middleware
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
    })
);

// Rate limiting
const limiter = rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX_REQUESTS,
    message: {
        error: "Too many requests from this IP, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// CORS configuration
app.use(
    cors({
        origin: config.CORS_ORIGIN,
        credentials: true,
    })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        body: req.method === "POST" ? req.body : undefined,
    });
    next();
});

// Routes
app.use("/api", routes);

// 404 handler
app.use((req, res) => {
    logger.warn(`404 - Route not found: ${req.method} ${req.path}`);
    res.status(404).json({
        success: false,
        error: "Route not found",
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    logger.error("Unhandled error", {
        error: error.message,
        stack: error.stack,
        method: req.method,
        path: req.path,
    });

    // Don't leak error details in production
    const isDevelopment = config.NODE_ENV === "development";

    res.status(error.status || 500).json({
        success: false,
        error: isDevelopment ? error.message : "Internal server error",
        ...(isDevelopment && { stack: error.stack }),
    });
});

module.exports = app;
