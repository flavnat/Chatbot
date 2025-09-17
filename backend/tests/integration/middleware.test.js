const request = require("supertest");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// Create test app with middleware
const createTestApp = () => {
    const app = express();

    // Security middleware
    app.use(
        helmet({
            crossOriginResourcePolicy: { policy: "cross-origin" },
        })
    );

    // Rate limiting
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: {
            error: "Too many requests from this IP, please try again later.",
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
    app.use(limiter);

    // CORS configuration
    app.use(
        cors({
            origin: "http://localhost:5173",
            credentials: true,
        })
    );

    // Body parsing middleware
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Test routes
    app.get("/api/test", (req, res) => {
        res.json({ message: "Test endpoint" });
    });

    app.post("/api/test", (req, res) => {
        res.json({ received: req.body });
    });

    return app;
};

describe("Middleware Integration Tests", () => {
    let app;

    beforeEach(() => {
        app = createTestApp();
    });

    describe("Helmet Security Headers", () => {
        test("should set security headers", async () => {
            const response = await request(app).get("/api/test").expect(200);

            // Check for common security headers set by Helmet
            expect(response.headers["x-content-type-options"]).toBe("nosniff");
            expect(response.headers["x-frame-options"]).toBeDefined();
            expect(response.headers["x-xss-protection"]).toBeDefined();
            expect(response.headers["strict-transport-security"]).toBeDefined();
        });

        test("should set cross-origin resource policy", async () => {
            const response = await request(app).get("/api/test").expect(200);

            expect(response.headers["cross-origin-resource-policy"]).toBe(
                "cross-origin"
            );
        });
    });

    describe("CORS Configuration", () => {
        test("should allow requests from configured origin", async () => {
            const response = await request(app)
                .get("/api/test")
                .set("Origin", "http://localhost:5173")
                .expect(200);

            expect(response.headers["access-control-allow-origin"]).toBe(
                "http://localhost:5173"
            );
        });

        test("should include credentials in CORS response", async () => {
            const response = await request(app)
                .get("/api/test")
                .set("Origin", "http://localhost:5173")
                .expect(200);

            expect(response.headers["access-control-allow-credentials"]).toBe(
                "true"
            );
        });

        test("should handle preflight OPTIONS requests", async () => {
            const response = await request(app)
                .options("/api/test")
                .set("Origin", "http://localhost:5173")
                .set("Access-Control-Request-Method", "POST")
                .expect(204); // OPTIONS requests typically return 204

            expect(response.headers["access-control-allow-origin"]).toBe(
                "http://localhost:5173"
            );
        });
    });

    describe("Rate Limiting", () => {
        test("should allow requests within rate limit", async () => {
            // Make a few requests that should be within the limit
            for (let i = 0; i < 5; i++) {
                const response = await request(app)
                    .get("/api/test")
                    .expect(200);

                expect(response.body.message).toBe("Test endpoint");
            }
        });

        test("should configure rate limiting with proper message", async () => {
            // Test that rate limiting is configured by making a request
            const response = await request(app).get("/api/test").expect(200);

            expect(response.status).toBe(200);
            // Rate limiting headers should be present
            expect(response.headers["x-ratelimit-limit"]).toBeDefined();
        });
    });

    describe("Body Parsing", () => {
        test("should parse JSON bodies", async () => {
            const testData = { name: "test", value: 123 };

            const response = await request(app)
                .post("/api/test")
                .send(testData)
                .set("Content-Type", "application/json")
                .expect(200);

            expect(response.body.received).toEqual(testData);
        });

        test("should parse URL-encoded bodies", async () => {
            const response = await request(app)
                .post("/api/test")
                .send("name=test&value=123")
                .set("Content-Type", "application/x-www-form-urlencoded")
                .expect(200);

            expect(response.body.received).toEqual({
                name: "test",
                value: "123",
            });
        });

        test("should handle large JSON payloads within limit", async () => {
            const largeData = { data: "x".repeat(1000000) }; // 1MB of data

            const response = await request(app)
                .post("/api/test")
                .send(largeData)
                .set("Content-Type", "application/json")
                .expect(200);

            expect(response.body.received.data).toBe("x".repeat(1000000));
        });
    });

    describe("Request Size Limits", () => {
        test("should accept requests within size limits", async () => {
            const normalData = { data: "x".repeat(1000) };

            const response = await request(app)
                .post("/api/test")
                .send(normalData)
                .set("Content-Type", "application/json")
                .expect(200);

            expect(response.body.received.data.length).toBe(1000);
        });
    });

    describe("Error Handling", () => {
        test("should handle malformed JSON gracefully", async () => {
            const response = await request(app)
                .post("/api/test")
                .send("invalid json {")
                .set("Content-Type", "application/json")
                .expect(400);

            // Express should handle malformed JSON with a 400 status
            expect(response.status).toBe(400);
        });

        test("should handle missing content type", async () => {
            const response = await request(app)
                .post("/api/test")
                .send("some data")
                .expect(200);

            // Should still work with default content type handling
            expect(response.status).toBe(200);
        });
    });
});
