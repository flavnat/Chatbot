import { takeLatest, put, call, select } from "redux-saga/effects";
import { SEND_MESSAGE, SEND_BOT_MESSAGE } from "./constants";
import {
    addMessage,
    setTyping,
    sendMessageSuccess,
    sendMessageError,
} from "./actions";
import { chatService } from "../../services/chatService";

function* handleSendMessage(action) {
    try {
        const userMessage = {
            id: Date.now(),
            text: action.payload,
            sender: "user",
            timestamp: new Date().toISOString(),
        };

        // Add user message to chat
        yield put(addMessage(userMessage));

        // Show typing indicator
        yield put(setTyping(true));

        // Get current sessionId from state
        const { sessionId } = yield select((state) => state.chatBot);

        // Call the backend API
        const response = yield call(chatService.sendMessage, {
            message: action.payload,
            sessionId, // Include sessionId if available
            provider: "gemini", // Default provider
            useRag: true,
            topK: 5,
        });

        // Hide typing indicator
        yield put(setTyping(false));

        if (response.success) {
            // Add bot response to chat
            const botMessage = {
                id: Date.now() + 1,
                text:
                    response.data.message.content || "I received your message!",
                sender: "bot",
                timestamp: new Date().toISOString(),
                metadata: response.data.message.metadata || {},
            };
            yield put(addMessage(botMessage));
            yield put(
                sendMessageSuccess({
                    sessionId: response.data.sessionId,
                    message: response.data.message,
                })
            );
        } else {
            // Handle API error
            const errorMessage = {
                id: Date.now() + 1,
                text: `Sorry, I encountered an error: ${response.error}`,
                sender: "bot",
                timestamp: new Date().toISOString(),
            };
            yield put(addMessage(errorMessage));
            yield put(sendMessageError(response.error));
        }
    } catch (error) {
        // Hide typing indicator
        yield put(setTyping(false));

        // Handle unexpected errors
        const errorMessage = {
            id: Date.now() + 1,
            text: "Sorry, I'm having trouble connecting to the server. Please try again later.",
            sender: "bot",
            timestamp: new Date().toISOString(),
        };
        yield put(addMessage(errorMessage));

        console.error("Chat saga error:", error);
    }
}

function* handleSendBotMessage(action) {
    const botMessage = {
        id: Date.now(),
        text: action.payload,
        sender: "bot",
        timestamp: new Date().toISOString(),
    };
    yield put(addMessage(botMessage));
}

export default function* chatBotSaga() {
    yield takeLatest(SEND_MESSAGE, handleSendMessage);
    yield takeLatest(SEND_BOT_MESSAGE, handleSendBotMessage);
}
