export default {
    testEnvironment: "jsdom",
    setupFilesAfterEnv: ["<rootDir>/src/setupTests.js"],
    moduleNameMapper: {
        "\\.(css|less|scss|sass)$": "identity-obj-proxy",
        "\\.(jpg|jpeg|png|gif|svg)$": "<rootDir>/src/__mocks__/fileMock.js",
    },
    transform: {
        "^.+\\.(js|jsx)$": "babel-jest",
    },
    transformIgnorePatterns: [
        "node_modules/(?!react-markdown|@loadable|redux-saga|axios)",
    ],
    testMatch: [
        "<rootDir>/src/**/__tests__/**/*.(js|jsx)",
        "<rootDir>/src/**/*.(test|spec).(js|jsx)",
    ],
    collectCoverageFrom: [
        "src/**/*.(js|jsx)",
        "!src/index.js",
        "!src/main.jsx",
        "!src/setupTests.js",
    ],
    coverageDirectory: "coverage",
    coverageReporters: ["text", "lcov", "html"],
    // Ensure Jest globals are available
    injectGlobals: true,
};
