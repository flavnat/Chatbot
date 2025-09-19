/// <reference types="jest" />

import { chatService, healthService } from "../../../services/chatService";

// Mock axios
jest.mock("axios", () => ({
    create: jest.fn(() => ({
        post: jest.fn(),
        get: jest.fn(),
        interceptors: {
            request: { use: jest.fn() },
            response: { use: jest.fn() },
        },
    })),
}));

import api from "../../../services/api";

describe("ChatService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("sendMessage", () => {
        const mockMessage = "Hello, how can I help you?";

        test("should send message successfully", async () => {
            const mockResponse = {
                data: {
                    success: true,
                    data: {
                        sessionId: "session_123",
                        message: {
                            id: "msg_123",
                            content: "Hi there! How can I help you today?",
                            metadata: { provider: "gemini" },
                        },
                    },
                },
            };

            api.post.mockResolvedValue(mockResponse);

            const result = await chatService.sendMessage({
                message: mockMessage,
                sessionId: "session_123",
                provider: "gemini",
                useRag: true,
                topK: 5,
            });

            expect(api.post).toHaveBeenCalledWith("/chat/message", {
                message: mockMessage,
                sessionId: "session_123",
                provider: "gemini",
                useRag: true,
                topK: 5,
            });

            expect(result).toEqual({
                success: true,
                data: mockResponse.data,
            });
        });

        test("should handle API error", async () => {
            const mockError = {
                response: {
                    data: {
                        message: "Internal Server Error",
                    },
                },
            };
            api.post.mockRejectedValue(mockError);

            const result = await chatService.sendMessage({
                message: mockMessage,
            });

            expect(result).toEqual({
                success: false,
                error: "Internal Server Error",
            });
        });

        test("should handle network error", async () => {
            const networkError = new Error("Network Error");

            api.post.mockRejectedValue(networkError);

            const result = await chatService.sendMessage({
                message: mockMessage,
            });

            expect(result).toEqual({
                success: false,
                error: "Network Error",
            });
        });

        test("should validate empty message", async () => {
            const result = await chatService.sendMessage({
                message: "",
            });

            expect(result).toEqual({
                success: false,
                error: "Message cannot be empty",
            });

            expect(api.post).not.toHaveBeenCalled();
        });

        test("should validate whitespace-only message", async () => {
            const result = await chatService.sendMessage({
                message: "   ",
            });

            expect(result).toEqual({
                success: false,
                error: "Message cannot be empty",
            });

            expect(api.post).not.toHaveBeenCalled();
        });
    });

    describe("getChatHistory", () => {
        const mockSessionId = "session_123";

        test("should get chat history successfully", async () => {
            const mockResponse = {
                data: {
                    success: true,
                    data: {
                        sessionId: mockSessionId,
                        messages: [
                            {
                                id: "msg_1",
                                content: "Hello",
                                sender: "user",
                                timestamp: "2023-01-01T10:00:00.000Z",
                            },
                            {
                                id: "msg_2",
                                content: "Hi there!",
                                sender: "bot",
                                timestamp: "2023-01-01T10:01:00.000Z",
                            },
                        ],
                    },
                },
            };

            api.get.mockResolvedValue(mockResponse);

            const result = await chatService.getChatHistory(mockSessionId);

            expect(api.get).toHaveBeenCalledWith(
                `/chat/history/${mockSessionId}`
            );
            expect(result).toEqual({
                success: true,
                data: mockResponse.data,
            });
        });

        test("should handle API error when getting chat history", async () => {
            const mockError = {
                response: {
                    data: {
                        message: "Session not found",
                    },
                },
            };
            api.get.mockRejectedValue(mockError);

            const result = await chatService.getChatHistory(mockSessionId);

            expect(result).toEqual({
                success: false,
                error: "Session not found",
            });
        });

        test("should handle network error when getting chat history", async () => {
            const networkError = new Error("Network Error");
            api.get.mockRejectedValue(networkError);

            const result = await chatService.getChatHistory(mockSessionId);

            expect(result).toEqual({
                success: false,
                error: "Network Error",
            });
        });

        test("should handle error without response data", async () => {
            const errorWithoutResponse = new Error("Connection timeout");
            api.get.mockRejectedValue(errorWithoutResponse);

            const result = await chatService.getChatHistory(mockSessionId);

            expect(result).toEqual({
                success: false,
                error: "Connection timeout",
            });
        });
    });

    describe("createSession", () => {
        test("should create new session successfully", async () => {
            const mockResponse = {
                data: {
                    success: true,
                    data: {
                        sessionId: "new_session_123",
                        createdAt: "2023-01-01T10:00:00.000Z",
                        metadata: {
                            provider: "gemini",
                            useRag: true,
                        },
                    },
                },
            };

            api.post.mockResolvedValue(mockResponse);

            const result = await chatService.createSession();

            expect(api.post).toHaveBeenCalledWith("/chat/session");
            expect(result).toEqual({
                success: true,
                data: mockResponse.data,
            });
        });

        test("should handle API error when creating session", async () => {
            const mockError = {
                response: {
                    data: {
                        message: "Failed to create session",
                    },
                },
            };
            api.post.mockRejectedValue(mockError);

            const result = await chatService.createSession();

            expect(result).toEqual({
                success: false,
                error: "Failed to create session",
            });
        });

        test("should handle network error when creating session", async () => {
            const networkError = new Error("Network Error");
            api.post.mockRejectedValue(networkError);

            const result = await chatService.createSession();

            expect(result).toEqual({
                success: false,
                error: "Network Error",
            });
        });
    });
});

describe("HealthService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("checkHealth", () => {
        test("should check health successfully", async () => {
            const mockResponse = {
                data: {
                    success: true,
                    data: {
                        status: "healthy",
                        timestamp: "2023-01-01T10:00:00.000Z",
                        services: {
                            database: "healthy",
                            api: "healthy",
                        },
                    },
                },
            };

            api.get.mockResolvedValue(mockResponse);

            const result = await healthService.checkHealth();

            expect(api.get).toHaveBeenCalledWith("/health");
            expect(result).toEqual({
                success: true,
                data: mockResponse.data,
            });
        });

        test("should handle API error when checking health", async () => {
            const mockError = {
                response: {
                    data: {
                        message: "Service unavailable",
                    },
                },
            };
            api.get.mockRejectedValue(mockError);

            const result = await healthService.checkHealth();

            expect(result).toEqual({
                success: false,
                error: "Service unavailable",
                status: "unhealthy",
            });
        });

        test("should handle network error when checking health", async () => {
            const networkError = new Error("Network Error");
            api.get.mockRejectedValue(networkError);

            const result = await healthService.checkHealth();

            expect(result).toEqual({
                success: false,
                error: "Network Error",
                status: "unhealthy",
            });
        });
    });

    describe("getApiInfo", () => {
        test("should get API info successfully", async () => {
            const mockResponse = {
                data: {
                    success: true,
                    data: {
                        version: "1.0.0",
                        environment: "production",
                        endpoints: [
                            "/chat/message",
                            "/chat/history",
                            "/chat/session",
                            "/health",
                        ],
                    },
                },
            };

            api.get.mockResolvedValue(mockResponse);

            const result = await healthService.getApiInfo();

            expect(api.get).toHaveBeenCalledWith("/");
            expect(result).toEqual({
                success: true,
                data: mockResponse.data,
            });
        });

        test("should handle API error when getting API info", async () => {
            const mockError = {
                response: {
                    data: {
                        message: "API info not available",
                    },
                },
            };
            api.get.mockRejectedValue(mockError);

            const result = await healthService.getApiInfo();

            expect(result).toEqual({
                success: false,
                error: "API info not available",
            });
        });

        test("should handle network error when getting API info", async () => {
            const networkError = new Error("Network Error");
            api.get.mockRejectedValue(networkError);

            const result = await healthService.getApiInfo();

            expect(result).toEqual({
                success: false,
                error: "Network Error",
            });
        });
    });
});
