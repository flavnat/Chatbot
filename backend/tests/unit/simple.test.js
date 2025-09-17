describe("Simple Test", () => {
    test("should pass a simple test", () => {
        expect(1 + 1).toBe(2);
    });

    test("should handle basic string operations", () => {
        const str = "hello";
        expect(str.length).toBe(5);
        expect(str.toUpperCase()).toBe("HELLO");
    });
});
