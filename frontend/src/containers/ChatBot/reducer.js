import { produce } from "immer";
import {
    ADD_MESSAGE,
    SET_TYPING,
    SEND_MESSAGE_SUCCESS,
    SEND_MESSAGE_ERROR,
    CLEAR_MESSAGES,
    LOAD_MESSAGES_FROM_STORAGE,
    SET_LIMIT_REACHED,
} from "./constants";

export const initialState = {
    messages: [
        {
            id: 1,
            text: "Hello! How can I help you today?",
            sender: "bot",
            timestamp: new Date().toISOString(),
        },
    ],
    typing: false,
    sessionId: null,
    error: null,
    limitReached: false,
};

const chatBotReducer = (state = initialState, action) =>
    produce(state, (draft) => {
        switch (action.type) {
            case ADD_MESSAGE:
                draft.messages.push(action.payload);
                break;
            case SET_TYPING:
                draft.typing = action.payload;
                break;
            case SEND_MESSAGE_SUCCESS:
                draft.sessionId = action.payload.sessionId;
                draft.error = null;
                break;
            case SEND_MESSAGE_ERROR:
                draft.error = action.payload;
                break;
            case CLEAR_MESSAGES:
                draft.messages = [initialState.messages[0]];
                draft.sessionId = null;
                draft.error = null;
                break;
            case LOAD_MESSAGES_FROM_STORAGE:
                draft.messages = action.payload;
                draft.sessionId = null;
                draft.error = null;
                break;
            case SET_LIMIT_REACHED:
                draft.limitReached = action.payload;
                break;
        }
    });

export default chatBotReducer;
