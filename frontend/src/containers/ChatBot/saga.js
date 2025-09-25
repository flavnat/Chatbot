import { takeLatest, put, call, select } from "redux-saga/effects";
import { SEND_MESSAGE, SEND_BOT_MESSAGE,UPDATE_USER_REACTION } from "./constants";
import {
    addMessage,
    setTyping,
    sendMessageSuccess,
    sendMessageError,
} from "./actions";
import { chatService } from "../../services/chatService";

export function* handleSendMessage(action) {
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
        try {
            const userMessage = {
                id: Date.now(),
                text: action.payload,
                sender: "user",
                timestamp: new Date().toISOString(),
            };

            // Add user message to chat (only on first attempt)
            if (retryCount === 0) {
                yield put(addMessage(userMessage));
            }

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
                    id: response.data.message.id,
                    text:
                        response.data.message.content ||
                        "I received your message!",
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
                return; // Success, exit the retry loop
            } else {
                // Handle API error with better messaging
                let errorText = `Sorry, I encountered an error: ${response.error}`;
                let shouldRetry = false;

                // Provide more user-friendly error messages and determine if we should retry
                if (response.error.includes("timeout")) {
                    if (retryCount < maxRetries) {
                        errorText = `Request timed out. Retrying... (${
                            retryCount + 1
                        }/${maxRetries})`;
                        shouldRetry = true;
                    } else {
                        errorText =
                            "Sorry, the request is taking longer than expected. The AI is still processing your message in the background. Please try again in a moment.";
                    }
                } else if (
                    response.error.includes("network") ||
                    response.error.includes("connection")
                ) {
                    if (retryCount < maxRetries) {
                        errorText = `Connection issue. Retrying... (${
                            retryCount + 1
                        }/${maxRetries})`;
                        shouldRetry = true;
                    } else {
                        errorText =
                            "Sorry, I'm having trouble connecting to the server. Please check your internet connection and try again.";
                    }
                }

                if (shouldRetry) {
                    retryCount++;
                    // Wait 2 seconds before retry (keep typing indicator)
                    yield new Promise((resolve) => setTimeout(resolve, 2000));
                    continue; // Retry the loop
                } else {
                    const errorMessage = {
                        id: Date.now() + 1,
                        text: errorText,
                        sender: "bot",
                        timestamp: new Date().toISOString(),
                    };
                    yield put(addMessage(errorMessage));
                    yield put(sendMessageError(response.error));
                    return; // No more retries, exit
                }
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
            return; // Exit on unexpected errors
        }
    }
}

export function* handleSendBotMessage(action) {
    const botMessage = {
        id: response.data.message.id,
        text: action.payload,
        sender: "bot",
        timestamp: new Date().toISOString(),
    };
    yield put(addMessage(botMessage));
}


export function* handleUpdateUserReaction(action) {
    const { messageId, reaction } = action.payload;

    try {
        const response = yield call(chatService.updateReaction, messageId, reaction);


           if (response.success) {
              yield put({
                 type: "UPDATE_USER_REACTION_SUCCESS",
                 payload: { messageId, reaction },
            });
}

else {
            console.error("Failed to update reaction:", response.error);
        }
    } catch (error) {
        console.error("Error updating reaction:", error);
    }
}


export default function* chatBotSaga() {
    yield takeLatest(SEND_MESSAGE, handleSendMessage);
    yield takeLatest(SEND_BOT_MESSAGE, handleSendBotMessage);
    yield takeLatest(UPDATE_USER_REACTION, handleUpdateUserReaction);
}