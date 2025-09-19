import rootReducer from "../reducers";

describe("rootReducer", () => {
    test("should combine reducers", () => {
        const state = rootReducer(undefined, { type: "@@INIT" });
        expect(state).toBeDefined();
        expect(typeof state).toBe("object");
    });
});
