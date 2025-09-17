module.exports = {
    testEnvironment: "node",
    testMatch: ["<rootDir>/tests/**/*.test.js", "<rootDir>/tests/**/*.spec.js"],
    collectCoverageFrom: [
        "src/**/*.js",
        "!src/**/*.test.js",
        "!src/**/*.spec.js",
    ],
    coverageDirectory: "coverage",
    coverageReporters: ["text", "lcov", "html"],
    setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
    testTimeout: 10000,
    verbose: true,
    forceExit: true,
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,
    maxWorkers: 1,
    detectOpenHandles: true,
    // Memory optimization settings
    maxConcurrency: 1,
    // Disable coverage for faster runs
    collectCoverage: false,
};
