import React, { useRef, useEffect } from "react";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import { MessagesContainer } from "../ChatBotWidget.styles";

const MessageList = ({ messages, typing, formatTime, handleReaction }) => {
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, typing]);

    return (
        <MessagesContainer>
            {messages.map((message) => (
                <div key={message.id}>
                    <MessageBubble
                        message={message}
                        formatTime={formatTime}
                        handleReaction={handleReaction}
                    />
                </div>
            ))}
            {typing && <TypingIndicator />}
            <div ref={messagesEndRef} />
        </MessagesContainer>
    );
};

export default MessageList;
