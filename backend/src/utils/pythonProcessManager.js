const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs").promises;
const logger = require("../utils/logger");
const config = require("../config");

class PythonProcessManager {
    constructor() {
        this.activeProcesses = new Map();
        this.maxProcesses = 5;
        this.processTimeout = 30000; // 30 seconds
    }

    /**
     * Execute a Python script with given arguments
     * @param {string} scriptName - Name of the Python script (without .py)
     * @param {Array} args - Arguments to pass to the script
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} - Result from Python script
     */
    async executeScript(scriptName, args = [], options = {}) {
        const scriptPath = path.join(
            config.PYTHON_SCRIPTS_PATH,
            `${scriptName}.py`
        );

        // Check if script exists
        try {
            await fs.access(scriptPath);
        } catch (error) {
            throw new Error(`Python script not found: ${scriptPath}`);
        }

        return new Promise((resolve, reject) => {
            const processId = `${scriptName}_${Date.now()}_${Math.random()
                .toString(36)
                .substr(2, 9)}`;

            logger.info(`Starting Python process: ${processId}`, {
                script: scriptName,
                args: args.join(" "),
            });

            // Prepare arguments
            const pythonArgs = [
                scriptPath,
                ...args.map((arg) => arg.toString()),
            ];

            // Set environment variables
            const env = {
                ...process.env,
                GOOGLE_API_KEY: config.GOOGLE_API_KEY,
                QDRANT_API_KEY: config.QDRANT_API_KEY,
                OPENAI_API_KEY: config.OPENAI_API_KEY,
                DEEPSEEK_API_KEY: config.DEEPSEEK_API_KEY,
                QDRANT_URL: config.QDRANT_URL,
                QDRANT_COLLECTION_NAME: config.QDRANT_COLLECTION_NAME,
            };

            // Spawn Python process
            const pythonProcess = spawn(config.PYTHON_PATH, pythonArgs, {
                cwd: config.PYTHON_SCRIPTS_PATH,
                env,
                stdio: ["pipe", "pipe", "pipe"],
                ...options,
            });

            // Store process reference
            this.activeProcesses.set(processId, {
                process: pythonProcess,
                startTime: Date.now(),
                scriptName,
            });

            let stdout = "";
            let stderr = "";
            let timeoutId;

            // Set timeout
            if (this.processTimeout > 0) {
                timeoutId = setTimeout(() => {
                    this.killProcess(processId);
                    reject(new Error(`Python process timeout: ${scriptName}`));
                }, this.processTimeout);
            }

            // Handle stdout
            pythonProcess.stdout.on("data", (data) => {
                stdout += data.toString();
            });

            // Handle stderr
            pythonProcess.stderr.on("data", (data) => {
                stderr += data.toString();
                logger.warn(`Python stderr: ${scriptName}`, {
                    stderr: data.toString(),
                });
            });

            // Handle process completion
            pythonProcess.on("close", (code) => {
                // Clear timeout
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }

                // Remove from active processes
                this.activeProcesses.delete(processId);

                logger.info(`Python process completed: ${processId}`, {
                    script: scriptName,
                    exitCode: code,
                    duration:
                        Date.now() -
                            this.activeProcesses.get(processId)?.startTime || 0,
                });

                if (code === 0) {
                    try {
                        // Try to parse JSON response
                        const result = JSON.parse(stdout.trim());
                        resolve(result);
                    } catch (parseError) {
                        // If not JSON, return as string
                        resolve({
                            output: stdout.trim(),
                            stderr: stderr.trim(),
                        });
                    }
                } else {
                    reject(
                        new Error(
                            `Python process failed: ${scriptName} (exit code: ${code})\n${stderr}`
                        )
                    );
                }
            });

            // Handle process errors
            pythonProcess.on("error", (error) => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }

                this.activeProcesses.delete(processId);
                logger.error(`Python process error: ${scriptName}`, {
                    error: error.message,
                });
                reject(
                    new Error(
                        `Failed to start Python process: ${error.message}`
                    )
                );
            });
        });
    }

    /**
     * Kill a specific process
     * @param {string} processId - Process ID to kill
     */
    killProcess(processId) {
        const processInfo = this.activeProcesses.get(processId);
        if (processInfo) {
            try {
                processInfo.process.kill("SIGTERM");
                logger.info(`Killed Python process: ${processId}`);
            } catch (error) {
                logger.error(`Failed to kill Python process: ${processId}`, {
                    error: error.message,
                });
            }
            this.activeProcesses.delete(processId);
        }
    }

    /**
     * Kill all active processes
     */
    killAllProcesses() {
        logger.info(
            `Killing ${this.activeProcesses.size} active Python processes`
        );
        for (const [processId] of this.activeProcesses) {
            this.killProcess(processId);
        }
    }

    /**
     * Get active processes count
     * @returns {number} - Number of active processes
     */
    getActiveProcessCount() {
        return this.activeProcesses.size;
    }

    /**
     * Get active processes info
     * @returns {Array} - Array of active process info
     */
    getActiveProcesses() {
        return Array.from(this.activeProcesses.entries()).map(([id, info]) => ({
            id,
            scriptName: info.scriptName,
            startTime: info.startTime,
            duration: Date.now() - info.startTime,
        }));
    }
}

// Create singleton instance
const pythonProcessManager = new PythonProcessManager();

// Graceful shutdown
process.on("SIGINT", () => {
    logger.info("Received SIGINT, shutting down Python processes...");
    pythonProcessManager.killAllProcesses();
    process.exit(0);
});

process.on("SIGTERM", () => {
    logger.info("Received SIGTERM, shutting down Python processes...");
    pythonProcessManager.killAllProcesses();
    process.exit(0);
});

module.exports = pythonProcessManager;
