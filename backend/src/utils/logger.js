const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");
const fs = require("fs");
const config = require("../config");

// Ensure logs directory exists
const logsDir = path.dirname(config.LOG_FILE);
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

        if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta)}`;
        }

        if (stack) {
            log += `\n${stack}`;
        }

        return log;
    })
);

// Create transports
const transports = [
    // Console transport for development
    new winston.transports.Console({
        level: config.LOG_LEVEL,
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        ),
        handleExceptions: true,
        handleRejections: true,
    }),

    // File transport for all logs
    new DailyRotateFile({
        filename: path.join(logsDir, "app-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        maxSize: "20m",
        maxFiles: "14d",
        level: config.LOG_LEVEL,
        format: logFormat,
        handleExceptions: true,
        handleRejections: true,
    }),

    // Separate error log file
    new DailyRotateFile({
        filename: path.join(logsDir, "error-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        maxSize: "20m",
        maxFiles: "30d",
        level: "error",
        format: logFormat,
        handleExceptions: true,
        handleRejections: true,
    }),
];

// Create logger instance
const logger = winston.createLogger({
    level: config.LOG_LEVEL,
    format: logFormat,
    transports,
    exitOnError: false,
});

// Add request logging middleware
logger.stream = {
    write: (message) => {
        logger.info(message.trim());
    },
};

module.exports = logger;
