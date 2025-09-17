// Test setup file
const mongoose = require("mongoose");

// Set test environment
process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://localhost:27017/chatbot_test";

// Mock environment variables for tests
process.env.GOOGLE_API_KEY = "test_google_key";
process.env.QDRANT_API_KEY = "test_qdrant_key";
process.env.OPENAI_API_KEY = "test_openai_key";
process.env.DEEPSEEK_API_KEY = "test_deepseek_key";
process.env.QDRANT_URL = "http://test.qdrant.io";
process.env.JWT_SECRET = "test_jwt_secret";

// Mock fs module to prevent file system access during tests
const fs = require("fs");
jest.mock("fs", () => ({
    ...jest.requireActual("fs"),
    existsSync: jest.fn(() => true),
    mkdirSync: jest.fn(),
}));

// Mock mongoose globally to prevent actual database connections
jest.mock("mongoose", () => ({
    connect: jest.fn().mockResolvedValue({
        connection: {
            host: "test-host",
            readyState: 1,
            on: jest.fn(),
            once: jest.fn(),
            close: jest.fn(),
        },
    }),
    connection: {
        on: jest.fn(),
        once: jest.fn(),
        close: jest.fn(),
        readyState: 1,
        host: "test-host",
    },
}));

// Global test setup
beforeAll(async () => {
    // Mongoose is already mocked above
});

// Clean up after each test
afterEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();
});

// Clean up after all tests
afterAll(async () => {
    // Restore all mocks
    jest.restoreAllMocks();
});
