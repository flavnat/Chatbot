const mongoose = require("mongoose");

// Chat Message Schema
const chatMessageSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        index: true,
    },
    userId: {
        type: String,
        index: true,
    },
    role: {
        type: String,
        enum: ["user", "assistant"],
        required: true,
    },
    message: {
        type: String,
        trim: true,
    },
    response: {
        type: String,
        trim: true,
    },
    provider: {
        type: String,
        enum: ["google", "openai", "deepseek"],
        default: "google",
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true,
    },
    metadata: {
        processingTime: Number,
        tokensUsed: Number,
        confidence: Number,
    },
});

// Chat Session Schema
const chatSessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    userId: {
        type: String,
        index: true,
    },
    title: {
        type: String,
        default: "New Chat",
    },
    provider: {
        type: String,
        enum: ["google", "openai", "deepseek"],
        default: "google",
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    lastActivity: {
        type: Date,
        default: Date.now,
    },
    messageCount: {
        type: Number,
        default: 0,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
});

// User Schema (for future authentication)
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user",
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    lastLogin: {
        type: Date,
    },
});

// Indexes
chatMessageSchema.index({ sessionId: 1, timestamp: -1 });
chatSessionSchema.index({ userId: 1, updatedAt: -1 });

// Pre-save middleware
chatSessionSchema.pre("save", function (next) {
    this.updatedAt = new Date();
    next();
});

// Static methods
chatSessionSchema.statics.findActiveByUserId = function (userId) {
    return this.find({ userId, isActive: true }).sort({ updatedAt: -1 });
};

chatMessageSchema.statics.getSessionMessages = function (
    sessionId,
    limit = 50
) {
    return this.find({ sessionId }).sort({ timestamp: 1 }).limit(limit);
};

// Models
const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
const ChatSession = mongoose.model("ChatSession", chatSessionSchema);
const User = mongoose.model("User", userSchema);

module.exports = {
    ChatMessage,
    ChatSession,
    User,
};
