import {
    sendMessage,
    sendBotMessage,
    addMessage,
    setTyping,
    sendMessageSuccess,
    sendMessageError,
    clearMessages,
} from "../actions";
import {
    SEND_MESSAGE,
    SEND_BOT_MESSAGE,
    ADD_MESSAGE,
    SET_TYPING,
    SEND_MESSAGE_SUCCESS,
    SEND_MESSAGE_ERROR,
    CLEAR_MESSAGES,
} from "../constants";

describe("ChatBot Actions", () => {
    test("sendMessage should create SEND_MESSAGE action", () => {
        const message = "Hello, world!";
        const expectedAction = {
            type: SEND_MESSAGE,
            payload: message,
        };

        expect(sendMessage(message)).toEqual(expectedAction);
    });

    test("sendBotMessage should create SEND_BOT_MESSAGE action", () => {
        const message = "Bot response";
        const expectedAction = {
            type: SEND_BOT_MESSAGE,
            payload: message,
        };

        expect(sendBotMessage(message)).toEqual(expectedAction);
    });

    test("addMessage should create ADD_MESSAGE action", () => {
        const message = {
            id: 1,
            text: "Test message",
            sender: "user",
            timestamp: "2023-01-01T00:00:00.000Z",
        };
        const expectedAction = {
            type: ADD_MESSAGE,
            payload: message,
        };

        expect(addMessage(message)).toEqual(expectedAction);
    });

    test("setTyping should create SET_TYPING action", () => {
        const typing = true;
        const expectedAction = {
            type: SET_TYPING,
            payload: typing,
        };

        expect(setTyping(typing)).toEqual(expectedAction);
    });

    test("sendMessageSuccess should create SEND_MESSAGE_SUCCESS action", () => {
        const response = {
            sessionId: "session_123",
            message: { content: "Success!" },
        };
        const expectedAction = {
            type: SEND_MESSAGE_SUCCESS,
            payload: response,
        };

        expect(sendMessageSuccess(response)).toEqual(expectedAction);
    });

    test("sendMessageError should create SEND_MESSAGE_ERROR action", () => {
        const error = "Network Error";
        const expectedAction = {
            type: SEND_MESSAGE_ERROR,
            payload: error,
        };

        expect(sendMessageError(error)).toEqual(expectedAction);
    });

    test("clearMessages should create CLEAR_MESSAGES action", () => {
        const expectedAction = {
            type: CLEAR_MESSAGES,
        };

        expect(clearMessages()).toEqual(expectedAction);
    });
});
