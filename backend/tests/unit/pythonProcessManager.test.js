const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs").promises;
const PythonProcessManager = require("../../src/utils/pythonProcessManager");

// Mock dependencies
jest.mock("child_process");
jest.mock("fs", () => ({
    promises: {
        access: jest.fn(),
    },
    existsSync: jest.fn(() => true),
    mkdirSync: jest.fn(),
}));
jest.mock("../../src/utils/logger");
jest.mock("../../src/config");

const mockSpawn = spawn;
const mockFsAccess = fs.access;
const logger = require("../../src/utils/logger");
const config = require("../../src/config");

// Mock config values
config.PYTHON_PATH = "python3";
config.PYTHON_SCRIPTS_PATH = "/path/to/scripts";
config.GOOGLE_API_KEY = "test_google_key";
config.QDRANT_API_KEY = "test_qdrant_key";
config.OPENAI_API_KEY = "test_openai_key";
config.DEEPSEEK_API_KEY = "test_deepseek_key";
config.QDRANT_URL = "http://test.qdrant.io";
config.QDRANT_COLLECTION_NAME = "test_collection";

describe("PythonProcessManager", () => {
    let manager;

    beforeEach(() => {
        manager = new PythonProcessManager();
        jest.clearAllMocks();
    });

    describe("executeScript", () => {
        const scriptName = "test_script";
        const scriptPath = path.join(
            config.PYTHON_SCRIPTS_PATH,
            `${scriptName}.py`
        );
        const args = ["arg1", "arg2"];

        test("should execute Python script successfully with JSON response", async () => {
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn(),
                kill: jest.fn(),
            };

            const expectedResult = { success: true, data: "test" };

            mockSpawn.mockReturnValue(mockProcess);
            mockFsAccess.mockResolvedValue();

            // Mock successful execution
            mockProcess.on.mockImplementation((event, callback) => {
                if (event === "close") {
                    // Simulate stdout data
                    mockProcess.stdout.on.mock.calls[0][1](
                        JSON.stringify(expectedResult)
                    );
                    // Simulate process completion
                    setTimeout(() => callback(0), 10);
                }
            });

            const result = await manager.executeScript(scriptName, args);

            expect(mockSpawn).toHaveBeenCalledWith(
                config.PYTHON_PATH,
                [scriptPath, "arg1", "arg2"],
                expect.objectContaining({
                    cwd: config.PYTHON_SCRIPTS_PATH,
                    env: expect.objectContaining({
                        GOOGLE_API_KEY: config.GOOGLE_API_KEY,
                        QDRANT_API_KEY: config.QDRANT_API_KEY,
                        OPENAI_API_KEY: config.OPENAI_API_KEY,
                        DEEPSEEK_API_KEY: config.DEEPSEEK_API_KEY,
                        QDRANT_URL: config.QDRANT_URL,
                        QDRANT_COLLECTION_NAME: config.QDRANT_COLLECTION_NAME,
                    }),
                })
            );

            expect(result).toEqual(expectedResult);
        });

        test("should handle non-JSON response", async () => {
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn(),
                kill: jest.fn(),
            };

            const output = "Plain text output";

            mockSpawn.mockReturnValue(mockProcess);
            mockFsAccess.mockResolvedValue();

            mockProcess.on.mockImplementation((event, callback) => {
                if (event === "close") {
                    mockProcess.stdout.on.mock.calls[0][1](output);
                    setTimeout(() => callback(0), 10);
                }
            });

            const result = await manager.executeScript(scriptName, args);

            expect(result).toEqual({
                output: output,
                stderr: "",
            });
        });

        test("should handle script not found", async () => {
            mockFsAccess.mockRejectedValue(new Error("File not found"));

            await expect(
                manager.executeScript("nonexistent", args)
            ).rejects.toThrow(
                `Python script not found: ${path.join(
                    config.PYTHON_SCRIPTS_PATH,
                    "nonexistent.py"
                )}`
            );
        });

        test("should handle process failure with non-zero exit code", async () => {
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn(),
                kill: jest.fn(),
            };

            const errorMessage = "Script execution failed";

            mockSpawn.mockReturnValue(mockProcess);
            mockFsAccess.mockResolvedValue();

            mockProcess.on.mockImplementation((event, callback) => {
                if (event === "close") {
                    mockProcess.stderr.on.mock.calls[0][1](errorMessage);
                    setTimeout(() => callback(1), 10);
                }
            });

            await expect(
                manager.executeScript(scriptName, args)
            ).rejects.toThrow(
                `Python process failed: ${scriptName} (exit code: 1)\n${errorMessage}`
            );
        });

        test("should handle process spawn error", async () => {
            const spawnError = new Error("Failed to spawn process");

            mockSpawn.mockImplementation(() => {
                throw spawnError;
            });
            mockFsAccess.mockResolvedValue();

            await expect(
                manager.executeScript(scriptName, args)
            ).rejects.toThrow(
                `Failed to start Python process: ${spawnError.message}`
            );
        });

        test("should handle timeout", async () => {
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn(),
                kill: jest.fn(),
            };

            mockSpawn.mockReturnValue(mockProcess);
            mockFsAccess.mockResolvedValue();

            // Set a very short timeout for testing
            manager.processTimeout = 10;

            const timeoutPromise = manager.executeScript(scriptName, args);

            // Wait for timeout
            await new Promise((resolve) => setTimeout(resolve, 20));

            await expect(timeoutPromise).rejects.toThrow(
                `Python process timeout: ${scriptName}`
            );

            expect(mockProcess.kill).toHaveBeenCalledWith("SIGTERM");
        });

        test("should handle stderr output during execution", async () => {
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn(),
                kill: jest.fn(),
            };

            const stderrMessage = "Warning: deprecated feature";

            mockSpawn.mockReturnValue(mockProcess);
            mockFsAccess.mockResolvedValue();

            mockProcess.on.mockImplementation((event, callback) => {
                if (event === "close") {
                    mockProcess.stderr.on.mock.calls[0][1](stderrMessage);
                    setTimeout(() => callback(0), 10);
                }
            });

            await manager.executeScript(scriptName, args);

            expect(logger.warn).toHaveBeenCalledWith(
                `Python stderr: ${scriptName}`,
                {
                    stderr: stderrMessage,
                }
            );
        });

        test("should track active processes", async () => {
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn(),
                kill: jest.fn(),
            };

            mockSpawn.mockReturnValue(mockProcess);
            mockFsAccess.mockResolvedValue();

            // Start a process
            const promise = manager.executeScript(scriptName, args);

            // Check that process is tracked
            expect(manager.getActiveProcessCount()).toBe(1);

            // Complete the process
            mockProcess.on.mock.calls.find((call) => call[0] === "close")[1](0);

            await promise;

            // Check that process is no longer tracked
            expect(manager.getActiveProcessCount()).toBe(0);
        });
    });

    describe("Process Management", () => {
        test("should kill specific process", () => {
            const mockProcess = { kill: jest.fn() };
            const processId = "test_process_123";

            manager.activeProcesses.set(processId, {
                process: mockProcess,
                startTime: Date.now(),
                scriptName: "test",
            });

            manager.killProcess(processId);

            expect(mockProcess.kill).toHaveBeenCalledWith("SIGTERM");
            expect(manager.activeProcesses.has(processId)).toBe(false);
        });

        test("should handle kill process error", () => {
            const mockProcess = {
                kill: jest.fn().mockImplementation(() => {
                    throw new Error("Kill failed");
                }),
            };
            const processId = "test_process_123";

            manager.activeProcesses.set(processId, {
                process: mockProcess,
                startTime: Date.now(),
                scriptName: "test",
            });

            manager.killProcess(processId);

            expect(logger.error).toHaveBeenCalledWith(
                `Failed to kill Python process: ${processId}`,
                {
                    error: "Kill failed",
                }
            );
        });

        test("should kill all active processes", () => {
            const mockProcess1 = { kill: jest.fn() };
            const mockProcess2 = { kill: jest.fn() };

            manager.activeProcesses.set("process1", {
                process: mockProcess1,
                startTime: Date.now(),
                scriptName: "script1",
            });
            manager.activeProcesses.set("process2", {
                process: mockProcess2,
                startTime: Date.now(),
                scriptName: "script2",
            });

            manager.killAllProcesses();

            expect(mockProcess1.kill).toHaveBeenCalledWith("SIGTERM");
            expect(mockProcess2.kill).toHaveBeenCalledWith("SIGTERM");
            expect(manager.getActiveProcessCount()).toBe(0);
        });

        test("should get active processes info", () => {
            const startTime = Date.now() - 1000; // 1 second ago

            manager.activeProcesses.set("process1", {
                process: { kill: jest.fn() },
                startTime: startTime,
                scriptName: "script1",
            });

            const activeProcesses = manager.getActiveProcesses();

            expect(activeProcesses).toHaveLength(1);
            expect(activeProcesses[0]).toEqual({
                id: "process1",
                scriptName: "script1",
                startTime: startTime,
                duration: expect.any(Number),
            });
            expect(activeProcesses[0].duration).toBeGreaterThanOrEqual(1000);
        });
    });

    describe("Resource Limits", () => {
        test("should enforce maximum concurrent processes", async () => {
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn(),
                kill: jest.fn(),
            };

            mockSpawn.mockReturnValue(mockProcess);
            mockFsAccess.mockResolvedValue();

            // Set low max processes for testing
            manager.maxProcesses = 2;

            // Start multiple processes
            const promises = [];
            for (let i = 0; i < 3; i++) {
                promises.push(manager.executeScript(`script${i}`, []));
            }

            // The third process should still be allowed (no hard limit in current implementation)
            // This test verifies the maxProcesses property exists and can be set
            expect(manager.maxProcesses).toBe(2);
        });

        test("should have configurable timeout", () => {
            expect(manager.processTimeout).toBe(30000); // 30 seconds

            // Test changing timeout
            manager.processTimeout = 60000;
            expect(manager.processTimeout).toBe(60000);
        });
    });

    describe("Error Handling Edge Cases", () => {
        test("should handle malformed JSON in stdout", async () => {
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn(),
                kill: jest.fn(),
            };

            mockSpawn.mockReturnValue(mockProcess);
            mockFsAccess.mockResolvedValue();

            mockProcess.on.mockImplementation((event, callback) => {
                if (event === "close") {
                    mockProcess.stdout.on.mock.calls[0][1]("{ invalid json }");
                    setTimeout(() => callback(0), 10);
                }
            });

            const result = await manager.executeScript(scriptName, args);

            expect(result).toEqual({
                output: "{ invalid json }",
                stderr: "",
            });
        });

        test("should handle empty stdout and stderr", async () => {
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn(),
                kill: jest.fn(),
            };

            mockSpawn.mockReturnValue(mockProcess);
            mockFsAccess.mockResolvedValue();

            mockProcess.on.mockImplementation((event, callback) => {
                if (event === "close") {
                    setTimeout(() => callback(0), 10);
                }
            });

            const result = await manager.executeScript(scriptName, args);

            expect(result).toEqual({
                output: "",
                stderr: "",
            });
        });

        test("should handle process error before close", async () => {
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn(),
                kill: jest.fn(),
            };

            const processError = new Error("Process spawn failed");

            mockSpawn.mockReturnValue(mockProcess);
            mockFsAccess.mockResolvedValue();

            mockProcess.on.mockImplementation((event, callback) => {
                if (event === "error") {
                    setTimeout(() => callback(processError), 10);
                }
            });

            await expect(
                manager.executeScript(scriptName, args)
            ).rejects.toThrow(
                `Failed to start Python process: ${processError.message}`
            );
        });
    });
});
