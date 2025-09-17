// Mock dotenv and path before requiring config
jest.mock("dotenv", () => ({
    config: jest.fn(),
}));

jest.mock("path", () => ({
    join: jest.fn((...args) => {
        // Handle specific path joins for config
        if (args.includes("../python_scripts")) {
            return "/home/agape/Documents/Development/Projects/Web(6)/Chatbot/backend/python_scripts";
        }
        if (args.includes("../../.env")) {
            return "/home/agape/Documents/Development/Projects/Web(6)/Chatbot/.env";
        }
        return args.join("/");
    }),
    dirname: jest.fn(
        () =>
            "/home/agape/Documents/Development/Projects/Web(6)/Chatbot/backend/src/config"
    ),
}));

// Mock dotenv to prevent loading .env file
jest.mock("dotenv", () => ({
    config: jest.fn(),
}));

const dotenv = require("dotenv");

describe("Configuration Module", () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        // Clear require cache and reset environment
        delete require.cache[require.resolve("../../src/config")];
        // Start with completely clean environment
        process.env = {};
        // Reset mocks
        jest.clearAllMocks();
    });

    afterEach(() => {
        // Restore original environment
        process.env = { ...originalEnv };
    });

    describe("Environment Variable Loading", () => {
        test("should load all required environment variables", () => {
            // Set up test environment variables
            process.env.NODE_ENV = "test";
            process.env.PORT = "3001";
            process.env.MONGODB_URI = "mongodb://test:27017/test";
            process.env.GOOGLE_API_KEY = "test_google_key";
            process.env.QDRANT_API_KEY = "test_qdrant_key";
            process.env.OPENAI_API_KEY = "test_openai_key";
            process.env.DEEPSEEK_API_KEY = "test_deepseek_key";
            process.env.QDRANT_URL = "http://test.qdrant.io";
            process.env.JWT_SECRET = "test_jwt_secret";

            const testConfig = require("../../src/config");

            expect(testConfig.NODE_ENV).toBe("test");
            expect(testConfig.PORT).toBe(3001);
            expect(testConfig.MONGODB_URI).toBe("mongodb://test:27017/test");
            expect(testConfig.GOOGLE_API_KEY).toBe("test_google_key");
            expect(testConfig.QDRANT_API_KEY).toBe("test_qdrant_key");
            expect(testConfig.OPENAI_API_KEY).toBe("test_openai_key");
            expect(testConfig.DEEPSEEK_API_KEY).toBe("test_deepseek_key");
            expect(testConfig.QDRANT_URL).toBe("http://test.qdrant.io");
        });

        test("should use default values when environment variables are not set", () => {
            jest.isolateModules(() => {
                // Ensure no environment variables are set
                delete process.env.NODE_ENV;
                delete process.env.PORT;
                delete process.env.MONGODB_URI;
                delete process.env.CORS_ORIGIN;
                delete process.env.LOG_LEVEL;
                delete process.env.QDRANT_COLLECTION_NAME;

                const testConfig = require("../../src/config");

                expect(testConfig.NODE_ENV).toBe("development");
                expect(testConfig.PORT).toBe(3000);
                expect(testConfig.MONGODB_URI).toBe(
                    "mongodb://localhost:27017/chatbot_db"
                );
                expect(testConfig.CORS_ORIGIN).toBe("http://localhost:5173");
                expect(testConfig.LOG_LEVEL).toBe("info");
                expect(testConfig.QDRANT_COLLECTION_NAME).toBe(
                    "chatbot_documents"
                );
            });
        });

        test("should parse numeric values correctly", () => {
            jest.isolateModules(() => {
                process.env.PORT = "4000";
                process.env.RATE_LIMIT_WINDOW_MS = "600000";
                process.env.RATE_LIMIT_MAX_REQUESTS = "200";

                const testConfig = require("../../src/config");

                expect(testConfig.PORT).toBe(4000);
                expect(testConfig.RATE_LIMIT_WINDOW_MS).toBe(600000);
                expect(testConfig.RATE_LIMIT_MAX_REQUESTS).toBe(200);
            });
        });
    });

    describe("Configuration Validation", () => {
        test("should throw error when required environment variables are missing", () => {
            jest.isolateModules(() => {
                delete process.env.GOOGLE_API_KEY;
                delete process.env.QDRANT_API_KEY;
                delete process.env.OPENAI_API_KEY;
                delete process.env.DEEPSEEK_API_KEY;
                delete process.env.QDRANT_URL;

                const testConfig = require("../../src/config");

                expect(() => {
                    testConfig.validate();
                }).toThrow(
                    "Missing required environment variables: GOOGLE_API_KEY, QDRANT_API_KEY, OPENAI_API_KEY, DEEPSEEK_API_KEY, QDRANT_URL"
                );
            });
        });

        test("should pass validation when all required variables are present", () => {
            // Set all required environment variables
            process.env.GOOGLE_API_KEY = "test_google_key";
            process.env.QDRANT_API_KEY = "test_qdrant_key";
            process.env.OPENAI_API_KEY = "test_openai_key";
            process.env.DEEPSEEK_API_KEY = "test_deepseek_key";
            process.env.QDRANT_URL = "http://test.qdrant.io";

            const testConfig = require("../../src/config");

            expect(() => {
                testConfig.validate();
            }).not.toThrow();
        });

        test("should return config object after successful validation", () => {
            // Set all required environment variables
            process.env.GOOGLE_API_KEY = "test_google_key";
            process.env.QDRANT_API_KEY = "test_qdrant_key";
            process.env.OPENAI_API_KEY = "test_openai_key";
            process.env.DEEPSEEK_API_KEY = "test_deepseek_key";
            process.env.QDRANT_URL = "http://test.qdrant.io";

            const testConfig = require("../../src/config");
            const validatedConfig = testConfig.validate();

            expect(validatedConfig).toBe(testConfig);
            expect(validatedConfig.GOOGLE_API_KEY).toBe("test_google_key");
        });
    });

    describe("Path Configuration", () => {
        test("should set correct Python scripts path", () => {
            const testConfig = require("../../src/config");
            const expectedPath =
                "/home/agape/Documents/Development/Projects/Web(6)/Chatbot/backend/python_scripts";

            expect(testConfig.PYTHON_SCRIPTS_PATH).toBe(expectedPath);
        });

        test("should set correct Python path", () => {
            jest.isolateModules(() => {
                process.env.PYTHON_PATH = "python3.9";
                const testConfig = require("../../src/config");

                expect(testConfig.PYTHON_PATH).toBe("python3.9");
            });
        });

        test("should use default Python path when not set", () => {
            delete process.env.PYTHON_PATH;
            const testConfig = require("../../src/config");

            expect(testConfig.PYTHON_PATH).toBe("python3");
        });
    });
});
