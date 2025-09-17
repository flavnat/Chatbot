const request = require("supertest");
const express = require("express");
const routes = require("../../src/routes");

// Create test app
const createTestApp = () => {
    const app = express();

    // Basic middleware for testing
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Mount routes
    app.use("/api", routes);

    return app;
};

describe("API Integration Tests", () => {
    let app;

    beforeEach(() => {
        app = createTestApp();
    });

    describe("GET /api/health", () => {
        test("should return health status", async () => {
            const response = await request(app).get("/api/health").expect(200);

            expect(response.body).toHaveProperty("status", "OK");
            expect(response.body).toHaveProperty("timestamp");
            expect(response.body).toHaveProperty("service", "Chatbot API");
            expect(response.body.timestamp).toMatch(
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
            );
        });

        test("should return correct content type", async () => {
            const response = await request(app)
                .get("/api/health")
                .expect(200)
                .expect("Content-Type", /json/);

            expect(response.body).toBeDefined();
        });
    });

    describe("GET /api", () => {
        test("should return API information", async () => {
            const response = await request(app).get("/api").expect(200);

            expect(response.body).toHaveProperty("name", "Chatbot API");
            expect(response.body).toHaveProperty("version", "1.0.0");
            expect(response.body).toHaveProperty("description");
            expect(response.body).toHaveProperty("endpoints");
            expect(response.body.endpoints).toHaveProperty("chat", "/api/chat");
            expect(response.body.endpoints).toHaveProperty(
                "health",
                "/api/health"
            );
        });

        test("should return correct content type", async () => {
            const response = await request(app)
                .get("/api")
                .expect(200)
                .expect("Content-Type", /json/);
        });
    });

    describe("GET /api/v1/help", () => {
        test("should return 404 for non-existent route", async () => {
            const response = await request(app).get("/api/v1/help").expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe("Route not found");
        });
    });

    describe("404 Handling", () => {
        test("should return 404 for unknown routes", async () => {
            const response = await request(app)
                .get("/api/unknown-route")
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe("Route not found");
        });

        test("should return 404 for non-API routes", async () => {
            const response = await request(app).get("/unknown").expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe("Route not found");
        });
    });

    describe("Method Not Allowed", () => {
        test("should return 404 for unsupported methods on health endpoint", async () => {
            const response = await request(app).post("/api/health").expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe("Route not found");
        });

        test("should return 404 for unsupported methods on root API endpoint", async () => {
            const response = await request(app).post("/api").expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe("Route not found");
        });
    });
});
