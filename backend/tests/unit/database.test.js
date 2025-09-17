const mongoose = require("mongoose");
const { connectDB } = require("../../src/database/connection");

describe("Database Connection", () => {
    let mockConnect;
    let mockConnection;

    beforeEach(() => {
        // Mock mongoose methods
        mockConnect = jest.spyOn(mongoose, "connect").mockResolvedValue({});
        mockConnection = {
            on: jest.fn(),
            once: jest.fn(),
            close: jest.fn(),
            readyState: 1,
            host: "test-host",
        };
        mongoose.connection = mockConnection;
    });

    afterEach(() => {
        // Restore original methods
        mockConnect.mockRestore();
        jest.clearAllMocks();
    });

    describe("connectDB function", () => {
        test("should connect to MongoDB successfully", async () => {
            const config = require("../../src/config");
            config.MONGODB_URI = "mongodb://test:27017/test";

            await connectDB();

            expect(mockConnect).toHaveBeenCalledWith(config.MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
        });

        test("should set up connection event listeners", async () => {
            await connectDB();

            expect(mockConnection.on).toHaveBeenCalledWith(
                "error",
                expect.any(Function)
            );
            expect(mockConnection.on).toHaveBeenCalledWith(
                "disconnected",
                expect.any(Function)
            );
            expect(mockConnection.on).toHaveBeenCalledWith(
                "reconnected",
                expect.any(Function)
            );
        });

        test("should handle connection errors", async () => {
            const consoleSpy = jest
                .spyOn(console, "error")
                .mockImplementation(() => {});
            const mockError = new Error("Connection failed");

            mockConnect.mockRejectedValue(mockError);

            await expect(connectDB()).rejects.toThrow("Connection failed");

            consoleSpy.mockRestore();
        });

        test("should log successful connection", async () => {
            const consoleSpy = jest
                .spyOn(console, "log")
                .mockImplementation(() => {});

            await connectDB();

            // The logger is used internally, but we can check if connection was established
            expect(mockConnect).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });
    });

    describe("Connection Event Handlers", () => {
        test("should handle error events", async () => {
            const loggerSpy = jest
                .spyOn(require("../../src/utils/logger"), "error")
                .mockImplementation(() => {});
            const mockError = new Error("Connection error");

            await connectDB();

            // Get the error handler function
            const errorHandler = mockConnection.on.mock.calls.find(
                (call) => call[0] === "error"
            )[1];

            // Call the error handler
            errorHandler(mockError);

            expect(loggerSpy).toHaveBeenCalledWith(
                "MongoDB connection error:",
                mockError
            );

            loggerSpy.mockRestore();
        });

        test("should handle disconnection events", async () => {
            const loggerSpy = jest
                .spyOn(require("../../src/utils/logger"), "warn")
                .mockImplementation(() => {});

            await connectDB();

            // Get the disconnected handler function
            const disconnectHandler = mockConnection.on.mock.calls.find(
                (call) => call[0] === "disconnected"
            )[1];

            // Call the disconnect handler
            disconnectHandler();

            expect(loggerSpy).toHaveBeenCalledWith("MongoDB disconnected");

            loggerSpy.mockRestore();
        });

        test("should handle reconnection events", async () => {
            const loggerSpy = jest
                .spyOn(require("../../src/utils/logger"), "info")
                .mockImplementation(() => {});

            await connectDB();

            // Get the reconnected handler function
            const reconnectHandler = mockConnection.on.mock.calls.find(
                (call) => call[0] === "reconnected"
            )[1];

            // Call the reconnect handler
            reconnectHandler();

            expect(loggerSpy).toHaveBeenCalledWith("MongoDB reconnected");

            loggerSpy.mockRestore();
        });
    });

    describe("Connection State", () => {
        test("should handle already connected state", async () => {
            // Simulate already connected
            mockConnection.readyState = 1;

            await connectDB();

            expect(mockConnect).toHaveBeenCalledTimes(1);
        });

        test("should handle disconnected state", async () => {
            // Simulate disconnected
            mockConnection.readyState = 0;

            await connectDB();

            expect(mockConnect).toHaveBeenCalledTimes(1);
        });
    });
});
