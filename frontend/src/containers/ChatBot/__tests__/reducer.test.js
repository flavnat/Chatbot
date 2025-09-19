import chatBotReducer, { initialState } from "../reducer";
import {
    ADD_MESSAGE,
    SET_TYPING,
    SEND_MESSAGE_SUCCESS,
    SEND_MESSAGE_ERROR,
    CLEAR_MESSAGES,
} from "../constants";

describe("chatBotReducer", () => {
    test("returns initial state", () => {
        expect(chatBotReducer(undefined, {})).toEqual(initialState);
    });

    describe("ADD_MESSAGE", () => {
        test("adds a message to the messages array", () => {
            const action = {
                type: ADD_MESSAGE,
                payload: {
                    id: 2,
                    text: "Test message",
                    sender: "user",
                    timestamp: "2023-01-01T10:00:00.000Z",
                },
            };

            const result = chatBotReducer(initialState, action);

            expect(result.messages).toHaveLength(2);
            expect(result.messages[1]).toEqual(action.payload);
            expect(result.messages[0]).toEqual(initialState.messages[0]); // Initial greeting preserved
        });

        test("adds multiple messages correctly", () => {
            const action1 = {
                type: ADD_MESSAGE,
                payload: {
                    id: 2,
                    text: "First message",
                    sender: "user",
                    timestamp: "2023-01-01T10:00:00.000Z",
                },
            };

            const action2 = {
                type: ADD_MESSAGE,
                payload: {
                    id: 3,
                    text: "Second message",
                    sender: "bot",
                    timestamp: "2023-01-01T10:01:00.000Z",
                },
            };

            const result1 = chatBotReducer(initialState, action1);
            const result2 = chatBotReducer(result1, action2);

            expect(result2.messages).toHaveLength(3);
            expect(result2.messages[1].text).toBe("First message");
            expect(result2.messages[2].text).toBe("Second message");
        });
    });

    describe("SET_TYPING", () => {
        test("sets typing to true", () => {
            const action = {
                type: SET_TYPING,
                payload: true,
            };

            const result = chatBotReducer(initialState, action);

            expect(result.typing).toBe(true);
        });

        test("sets typing to false", () => {
            const action = {
                type: SET_TYPING,
                payload: false,
            };

            const result = chatBotReducer(initialState, action);

            expect(result.typing).toBe(false);
        });
    });

    describe("SEND_MESSAGE_SUCCESS", () => {
        test("sets sessionId and clears error on success", () => {
            const stateWithError = {
                ...initialState,
                error: "Previous error",
            };

            const action = {
                type: SEND_MESSAGE_SUCCESS,
                payload: {
                    sessionId: "session-123",
                },
            };

            const result = chatBotReducer(stateWithError, action);

            expect(result.sessionId).toBe("session-123");
            expect(result.error).toBeNull();
        });

        test("updates sessionId when already set", () => {
            const stateWithSession = {
                ...initialState,
                sessionId: "old-session",
            };

            const action = {
                type: SEND_MESSAGE_SUCCESS,
                payload: {
                    sessionId: "new-session",
                },
            };

            const result = chatBotReducer(stateWithSession, action);

            expect(result.sessionId).toBe("new-session");
        });
    });

    describe("SEND_MESSAGE_ERROR", () => {
        test("sets error message", () => {
            const action = {
                type: SEND_MESSAGE_ERROR,
                payload: "Network error occurred",
            };

            const result = chatBotReducer(initialState, action);

            expect(result.error).toBe("Network error occurred");
        });

        test("overwrites previous error", () => {
            const stateWithError = {
                ...initialState,
                error: "Old error",
            };

            const action = {
                type: SEND_MESSAGE_ERROR,
                payload: "New error",
            };

            const result = chatBotReducer(stateWithError, action);

            expect(result.error).toBe("New error");
        });
    });

    describe("CLEAR_MESSAGES", () => {
        test("clears all messages except initial greeting", () => {
            const stateWithMessages = {
                ...initialState,
                messages: [
                    initialState.messages[0],
                    {
                        id: 2,
                        text: "User message",
                        sender: "user",
                        timestamp: "2023-01-01T10:00:00.000Z",
                    },
                    {
                        id: 3,
                        text: "Bot response",
                        sender: "bot",
                        timestamp: "2023-01-01T10:01:00.000Z",
                    },
                ],
                sessionId: "session-123",
                error: "Some error",
            };

            const action = {
                type: CLEAR_MESSAGES,
            };

            const result = chatBotReducer(stateWithMessages, action);

            expect(result.messages).toHaveLength(1);
            expect(result.messages[0]).toEqual(initialState.messages[0]);
            expect(result.sessionId).toBeNull();
            expect(result.error).toBeNull();
        });

        test("works when no additional messages exist", () => {
            const action = {
                type: CLEAR_MESSAGES,
            };

            const result = chatBotReducer(initialState, action);

            expect(result.messages).toHaveLength(1);
            expect(result.messages[0]).toEqual(initialState.messages[0]);
            expect(result.sessionId).toBeNull();
            expect(result.error).toBeNull();
        });
    });

    describe("Unknown actions", () => {
        test("returns state unchanged for unknown action", () => {
            const action = {
                type: "UNKNOWN_ACTION",
                payload: "test",
            };

            const result = chatBotReducer(initialState, action);

            expect(result).toEqual(initialState);
        });
    });

    describe("Immer integration", () => {
        test("does not mutate original state", () => {
            const originalState = { ...initialState };
            const action = {
                type: ADD_MESSAGE,
                payload: {
                    id: 2,
                    text: "Test",
                    sender: "user",
                    timestamp: "2023-01-01T10:00:00.000Z",
                },
            };

            const result = chatBotReducer(originalState, action);

            expect(originalState).toEqual(initialState);
            expect(result).not.toBe(originalState);
            expect(result.messages).not.toBe(originalState.messages);
        });
    });
});
