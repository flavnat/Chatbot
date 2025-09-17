const request = require("supertest");
const express = require("express");
const chatRoutes = require("../../src/routes/chat");

// Mock dependencies
jest.mock("../../src/utils/pythonProcessManager");
jest.mock("../../src/utils/logger");
jest.mock("../../src/models");

const pythonProcessManager = require("../../src/utils/pythonProcessManager");
const logger = require("../../src/utils/logger");
const { ChatMessage, ChatSession } = require("../../src/models");

// Create test app
const createTestApp = () => {
    const app = express();

    // Basic middleware for testing
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Mount chat routes
    app.use("/api/chat", chatRoutes);

    return app;
};

describe("Chat Routes Integration Tests", () => {
    let app;

    beforeEach(() => {
        app = createTestApp();
        jest.clearAllMocks();
    });

    describe("POST /api/chat/message", () => {
        const validMessage = {
            message: "Hello, how are you?",
            provider: "gemini",
            useRag: true,
            topK: 3,
        };

        test("should process valid chat message successfully", async () => {
            // Mock database operations
            const mockSession = {
                _id: "session123",
                title: "Hello, how are you?",
                messageCount: 0,
                lastActivity: new Date(),
                save: jest.fn(),
            };

            const mockUserMessage = {
                _id: "userMsg123",
                sessionId: "session123",
                role: "user",
                content: "Hello, how are you?",
                timestamp: new Date(),
                save: jest.fn(),
            };

            const mockAIMessage = {
                _id: "aiMsg123",
                sessionId: "session123",
                role: "assistant",
                content: "I am doing well, thank you!",
                metadata: {
                    provider: "gemini",
                    model: "gemini-2.0-flash",
                    usage: { tokens: 150 },
                },
                timestamp: new Date(),
                save: jest.fn(),
            };

            ChatSession.mockImplementation(() => mockSession);
            ChatMessage.mockImplementation((data) => {
                if (data.role === "user") return mockUserMessage;
                return mockAIMessage;
            });

            // Mock Python process manager
            pythonProcessManager.executeScript.mockResolvedValue({
                response: "I am doing well, thank you!",
                provider: "gemini",
                model: "gemini-2.0-flash",
                usage: { tokens: 150 },
                rag_used: true,
                context_documents: ["doc1", "doc2"],
            });

            const response = await request(app)
                .post("/api/chat/message")
                .send(validMessage)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.sessionId).toBe("session123");
            expect(response.body.message.content).toBe(
                "I am doing well, thank you!"
            );
            expect(response.body.message.metadata.provider).toBe("gemini");
        });

        test("should create new session when sessionId not provided", async () => {
            const mockSession = {
                _id: "newSession123",
                title: "Hello, how are you?",
                messageCount: 0,
                lastActivity: new Date(),
                save: jest.fn(),
            };

            ChatSession.mockImplementation(() => mockSession);
            ChatMessage.mockImplementation(() => ({
                _id: "msg123",
                save: jest.fn(),
            }));

            pythonProcessManager.executeScript.mockResolvedValue({
                response: "Hello! How can I help you?",
                provider: "gemini",
                model: "gemini-pro",
                usage: { tokens: 100 },
            });

            const response = await request(app)
                .post("/api/chat/message")
                .send({ message: "Hello, how are you?" })
                .expect(200);

            expect(ChatSession).toHaveBeenCalled();
            expect(response.body.sessionId).toBe("newSession123");
        });

        test("should return 400 for invalid message length", async () => {
            const response = await request(app)
                .post("/api/chat/message")
                .send({ message: "" })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.errors).toBeDefined();
        });

        test("should return 400 for invalid provider", async () => {
            const response = await request(app)
                .post("/api/chat/message")
                .send({
                    message: "Hello",
                    provider: "invalid_provider",
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.errors).toBeDefined();
        });

        test("should handle Python script errors", async () => {
            const mockSession = {
                _id: "session123",
                save: jest.fn(),
            };

            ChatSession.mockImplementation(() => mockSession);
            ChatMessage.mockImplementation(() => ({
                _id: "msg123",
                save: jest.fn(),
            }));

            pythonProcessManager.executeScript.mockResolvedValue({
                error: "Python script failed",
            });

            const response = await request(app)
                .post("/api/chat/message")
                .send(validMessage)
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe("Failed to process chat message");
        });
    });

    describe("GET /api/chat/sessions", () => {
        test("should return list of chat sessions", async () => {
            const mockSessions = [
                {
                    _id: "session1",
                    title: "First Session",
                    messageCount: 5,
                    createdAt: new Date(),
                    lastActivity: new Date(),
                },
                {
                    _id: "session2",
                    title: "Second Session",
                    messageCount: 3,
                    createdAt: new Date(),
                    lastActivity: new Date(),
                },
            ];

            ChatSession.find.mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue(mockSessions),
            });

            const response = await request(app)
                .get("/api/chat/sessions")
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.sessions).toHaveLength(2);
            expect(response.body.sessions[0].title).toBe("First Session");
        });

        test("should handle database errors", async () => {
            ChatSession.find.mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockRejectedValue(new Error("Database error")),
            });

            const response = await request(app)
                .get("/api/chat/sessions")
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe("Failed to fetch chat sessions");
        });
    });

    describe("GET /api/chat/sessions/:sessionId/messages", () => {
        test("should return messages for valid session", async () => {
            const mockSession = {
                _id: "session123",
                title: "Test Session",
                messageCount: 2,
            };

            const mockMessages = [
                {
                    _id: "msg1",
                    role: "user",
                    content: "Hello",
                    timestamp: new Date(),
                    metadata: {},
                },
                {
                    _id: "msg2",
                    role: "assistant",
                    content: "Hi there!",
                    timestamp: new Date(),
                    metadata: { provider: "gemini" },
                },
            ];

            ChatSession.findById.mockResolvedValue(mockSession);
            ChatMessage.find.mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                skip: jest.fn().mockResolvedValue(mockMessages),
            });

            const response = await request(app)
                .get("/api/chat/sessions/session123/messages")
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.session.title).toBe("Test Session");
            expect(response.body.messages).toHaveLength(2);
        });

        test("should return 404 for non-existent session", async () => {
            ChatSession.findById.mockResolvedValue(null);

            const response = await request(app)
                .get("/api/chat/sessions/invalid-session/messages")
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe("Chat session not found");
        });
    });

    describe("DELETE /api/chat/sessions/:sessionId", () => {
        test("should delete session and messages successfully", async () => {
            ChatSession.findByIdAndDelete.mockResolvedValue({
                _id: "session123",
            });
            ChatMessage.deleteMany.mockResolvedValue({ deletedCount: 5 });

            const response = await request(app)
                .delete("/api/chat/sessions/session123")
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe(
                "Chat session deleted successfully"
            );
            expect(ChatSession.findByIdAndDelete).toHaveBeenCalledWith(
                "session123"
            );
            expect(ChatMessage.deleteMany).toHaveBeenCalledWith({
                sessionId: "session123",
            });
        });

        test("should handle database errors during deletion", async () => {
            ChatSession.findByIdAndDelete.mockRejectedValue(
                new Error("Delete failed")
            );

            const response = await request(app)
                .delete("/api/chat/sessions/session123")
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe("Failed to delete chat session");
        });
    });

    describe("POST /api/chat/documents", () => {
        const validDocuments = {
            documents: [
                {
                    content: "This is a test document",
                    meta: { source: "test" },
                },
                { content: "Another test document", meta: { source: "test2" } },
            ],
        };

        test("should add documents successfully", async () => {
            pythonProcessManager.executeScript.mockResolvedValue({
                message: "Documents added successfully",
                documents_indexed: 2,
            });

            const response = await request(app)
                .post("/api/chat/documents")
                .send(validDocuments)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.documentsAdded).toBe(2);
        });

        test("should return 400 for empty documents array", async () => {
            const response = await request(app)
                .post("/api/chat/documents")
                .send({ documents: [] })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.errors).toBeDefined();
        });

        test("should handle Python script errors", async () => {
            pythonProcessManager.executeScript.mockResolvedValue({
                error: "Failed to index documents",
            });

            const response = await request(app)
                .post("/api/chat/documents")
                .send(validDocuments)
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe("Failed to add documents");
        });
    });

    describe("GET /api/chat/stats", () => {
        test("should return chatbot statistics", async () => {
            pythonProcessManager.executeScript.mockResolvedValue({
                total_documents: 193,
                total_sessions: 10,
                total_messages: 150,
            });

            ChatSession.countDocuments.mockResolvedValue(10);
            ChatMessage.countDocuments.mockResolvedValue(150);

            const response = await request(app)
                .get("/api/chat/stats")
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.stats.total_documents).toBe(193);
            expect(response.body.stats.totalSessions).toBe(10);
            expect(response.body.stats.totalMessages).toBe(150);
        });

        test("should handle Python script errors", async () => {
            pythonProcessManager.executeScript.mockResolvedValue({
                error: "Failed to get stats",
            });

            const response = await request(app)
                .get("/api/chat/stats")
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe(
                "Failed to fetch chatbot statistics"
            );
        });
    });
});
