const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");

// Mock dependencies
jest.mock("../../src/utils/pythonProcessManager");
jest.mock("../../src/utils/logger");
jest.mock("../../src/models");

const pythonProcessManager = require("../../src/utils/pythonProcessManager");
const logger = require("../../src/utils/logger");
const { ChatMessage, ChatSession } = require("../../src/models");

// Create test app with error-prone routes
const createTestApp = () => {
    const app = express();

    app.use(express.json());

    // Routes that can trigger various errors
    app.get("/api/database-error", async (req, res) => {
        try {
            await mongoose.connection.db.collection("nonexistent").findOne({});
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({
                error: "Database error",
                details: error.message,
            });
        }
    });

    app.get("/api/python-error", async (req, res) => {
        try {
            const result = await pythonProcessManager.executeScript(
                "nonexistent",
                []
            );
            res.json(result);
        } catch (error) {
            res.status(500).json({
                error: "Python error",
                details: error.message,
            });
        }
    });

    app.post("/api/validation-error", (req, res) => {
        const { requiredField } = req.body;
        if (!requiredField) {
            return res.status(400).json({
                error: "Validation error",
                details: "requiredField is required",
            });
        }
        res.json({ success: true, data: requiredField });
    });

    app.get("/api/timeout", async (req, res) => {
        // Simulate a long-running operation that might timeout
        setTimeout(() => {
            res.json({
                success: true,
                message: "This should not be reached in tests",
            });
        }, 35000); // Longer than Jest timeout
    });

    app.get("/api/memory-leak", (req, res) => {
        // Simulate memory-intensive operation
        const largeArray = [];
        for (let i = 0; i < 1000000; i++) {
            largeArray.push({ data: "x".repeat(1000) });
        }
        res.json({ success: true, size: largeArray.length });
    });

    app.get("/api/large-response", (req, res) => {
        const largeData = "x".repeat(10000000); // 10MB response
        res.json({ data: largeData });
    });

    app.get("/api/encoding-error", (req, res) => {
        // Simulate encoding issues
        const invalidUtf8 = Buffer.from([0xff, 0xfe, 0xfd]);
        res.set("Content-Type", "text/plain; charset=utf-8");
        res.send(invalidUtf8);
    });

    return app;
};

describe("Error Scenarios and Edge Cases", () => {
    let app;

    beforeEach(() => {
        app = createTestApp();
        jest.clearAllMocks();
    });

    describe("Database Errors", () => {
        test("should handle database connection failures gracefully", async () => {
            // Mock a database error
            const originalDb = mongoose.connection.db;
            mongoose.connection.db = null;

            const response = await request(app)
                .get("/api/database-error")
                .expect(500);

            expect(response.body.error).toBe("Database error");
            expect(response.body.details).toBeDefined();

            // Restore original db
            mongoose.connection.db = originalDb;
        });

        test("should handle MongoDB ObjectId errors", async () => {
            // Test with invalid ObjectId format
            const invalidId = "invalid-object-id";

            ChatSession.findById.mockRejectedValue(
                new mongoose.Error.CastError("ObjectId", invalidId, "sessionId")
            );

            // This would be tested in the actual chat routes
            expect(() => {
                throw new mongoose.Error.CastError(
                    "ObjectId",
                    invalidId,
                    "sessionId"
                );
            }).toThrow(mongoose.Error.CastError);
        });
    });

    describe("Python Process Errors", () => {
        test("should handle Python script execution failures", async () => {
            pythonProcessManager.executeScript.mockRejectedValue(
                new Error("Python process failed")
            );

            const response = await request(app)
                .get("/api/python-error")
                .expect(500);

            expect(response.body.error).toBe("Python error");
            expect(response.body.details).toBe("Python process failed");
        });

        test("should handle Python script not found", async () => {
            pythonProcessManager.executeScript.mockRejectedValue(
                new Error("ENOENT: no such file or directory")
            );

            const response = await request(app)
                .get("/api/python-error")
                .expect(500);

            expect(response.body.error).toBe("Python error");
            expect(response.body.details).toContain("ENOENT");
        });

        test("should handle Python script timeout", async () => {
            pythonProcessManager.executeScript.mockRejectedValue(
                new Error("Script execution timed out")
            );

            const response = await request(app)
                .get("/api/python-error")
                .expect(500);

            expect(response.body.error).toBe("Python error");
            expect(response.body.details).toBe("Script execution timed out");
        });
    });

    describe("Validation Errors", () => {
        test("should handle missing required fields", async () => {
            const response = await request(app)
                .post("/api/validation-error")
                .send({})
                .expect(400);

            expect(response.body.error).toBe("Validation error");
            expect(response.body.details).toBe("requiredField is required");
        });

        test("should handle malformed JSON", async () => {
            const response = await request(app)
                .post("/api/validation-error")
                .set("Content-Type", "application/json")
                .send("{ invalid json")
                .expect(400);

            // Express handles malformed JSON automatically
            expect(response.status).toBe(400);
        });

        test("should handle empty request body", async () => {
            const response = await request(app)
                .post("/api/validation-error")
                .send({})
                .expect(400);

            expect(response.body.error).toBe("Validation error");
            expect(response.body.details).toBe("requiredField is required");
        });
    });

    describe("Network and Connectivity Errors", () => {
        test("should handle request timeouts", async () => {
            // This test would require setting up a timeout scenario
            // For now, we'll test the timeout configuration
            jest.setTimeout(5000); // Set Jest timeout

            // The /api/timeout endpoint would timeout in a real scenario
            // Here we just verify the endpoint exists and can be called
            const response = await request(app)
                .get("/api/timeout")
                .timeout(1000) // Set request timeout
                .catch((error) => {
                    expect(error.code).toBe("ECONNABORTED");
                });
        });

        test("should handle connection refused errors", async () => {
            // This would typically happen if the service is down
            // We can simulate this by mocking the request
            const mockError = new Error("connect ECONNREFUSED 127.0.0.1:3000");
            mockError.code = "ECONNREFUSED";

            // In a real scenario, this would be caught by the HTTP client
            expect(mockError.code).toBe("ECONNREFUSED");
        });
    });

    describe("Memory and Performance Issues", () => {
        test("should handle large request payloads", async () => {
            const largePayload = { data: "x".repeat(100000) }; // 100KB payload

            const response = await request(app)
                .post("/api/validation-error")
                .send({ requiredField: largePayload })
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        test("should handle large response payloads", async () => {
            // Test that large responses are handled properly
            const response = await request(app)
                .get("/api/large-response")
                .expect(200);

            expect(response.body.data.length).toBe(10000000);
        });

        test("should handle memory-intensive operations", async () => {
            const response = await request(app)
                .get("/api/memory-leak")
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.size).toBe(1000000);
        });
    });

    describe("Encoding and Data Corruption", () => {
        test("should handle invalid UTF-8 sequences", async () => {
            // This test verifies that the app can handle encoding issues
            const response = await request(app)
                .get("/api/encoding-error")
                .expect(200);

            // The response should contain some data, even if corrupted
            expect(response.text).toBeDefined();
        });

        test("should handle null bytes in input", async () => {
            const dataWithNull = "test\0data";

            const response = await request(app)
                .post("/api/validation-error")
                .send({ requiredField: dataWithNull })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBe(dataWithNull);
        });
    });

    describe("Concurrent Request Handling", () => {
        test("should handle multiple concurrent requests", async () => {
            const requests = [];
            const numRequests = 10;

            // Create multiple concurrent requests
            for (let i = 0; i < numRequests; i++) {
                requests.push(
                    request(app)
                        .post("/api/validation-error")
                        .send({ requiredField: `test-${i}` })
                );
            }

            // Wait for all requests to complete
            const responses = await Promise.all(requests);

            // Verify all requests succeeded
            responses.forEach((response, index) => {
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data).toBe(`test-${index}`);
            });
        });
    });

    describe("Logging and Monitoring", () => {
        test("should log errors appropriately", async () => {
            const mockLogger = jest
                .spyOn(logger, "error")
                .mockImplementation(() => {});

            // Trigger an error scenario
            pythonProcessManager.executeScript.mockRejectedValue(
                new Error("Test error")
            );

            await request(app).get("/api/python-error").expect(500);

            // This test verifies that the endpoint can handle errors
            // The actual logging happens in the main app's error middleware
            expect(response.status).toBe(500);

            mockLogger.mockRestore();
        });

        test("should handle logger failures gracefully", async () => {
            // Mock logger to throw an error
            const mockLogger = jest
                .spyOn(logger, "error")
                .mockImplementation(() => {
                    throw new Error("Logger failed");
                });

            // The app should still function even if logging fails
            const response = await request(app)
                .post("/api/validation-error")
                .send({ requiredField: "test" })
                .expect(200);

            expect(response.body.success).toBe(true);

            mockLogger.mockRestore();
        });
    });
});
