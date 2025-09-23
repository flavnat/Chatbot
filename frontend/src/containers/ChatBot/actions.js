import {
    SEND_MESSAGE,
    SEND_BOT_MESSAGE,
    ADD_MESSAGE,
    SET_TYPING,
    SEND_MESSAGE_SUCCESS,
    SEND_MESSAGE_ERROR,
    CLEAR_MESSAGES,
    SET_LIMIT_REACHED,
} from "./constants";

export function sendMessage(message) {
    return {
        type: SEND_MESSAGE,
        payload: message,
    };
}

export function sendBotMessage(message) {
    return {
        type: SEND_BOT_MESSAGE,
        payload: message,
    };
}

export function addMessage(message) {
    return {
        type: ADD_MESSAGE,
        payload: message,
    };
}

export function setLimitReached(limitReached) {
    return {
        type: SET_LIMIT_REACHED,
        payload: limitReached,
    };
}

export function setTyping(typing) {
    return {
        type: SET_TYPING,
        payload: typing,
    };
}

export function sendMessageSuccess(response) {
    return {
        type: SEND_MESSAGE_SUCCESS,
        payload: response,
    };
}

export function sendMessageError(error) {
    return {
        type: SEND_MESSAGE_ERROR,
        payload: error,
    };
}

export function clearMessages() {
    return {
        type: CLEAR_MESSAGES,
    };
}
