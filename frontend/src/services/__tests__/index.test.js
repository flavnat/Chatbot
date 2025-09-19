import services from "../index";

describe("Services Index", () => {
    test("should export services object", () => {
        expect(services).toBeDefined();
        expect(typeof services).toBe("object");
    });
});
