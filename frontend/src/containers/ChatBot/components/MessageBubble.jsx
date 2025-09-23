import React from "react";
import ReactMarkdown from "react-markdown";
import {
    MessageBubble,
    MessageWrapper,
    Timestamp,
    BotMessageWrapper,
    BotIcon,
} from "../ChatBotWidget.styles";

const MessageBubbleComponent = ({ message, formatTime }) => {
    if (message.sender === "user") {
        return (
            <MessageWrapper>
                <MessageBubble sender={message.sender}>
                    <ReactMarkdown
                        components={{
                            p: ({ children }) => (
                                <span style={{ margin: 0 }}>{children}</span>
                            ),
                            strong: ({ children }) => (
                                <strong style={{ fontWeight: "bold" }}>
                                    {children}
                                </strong>
                            ),
                            ol: ({ children }) => (
                                <ol
                                    style={{
                                        margin: "4px 0",
                                        paddingLeft: "16px",
                                    }}
                                >
                                    {children}
                                </ol>
                            ),
                            ul: ({ children }) => (
                                <ul
                                    style={{
                                        margin: "4px 0",
                                        paddingLeft: "16px",
                                    }}
                                >
                                    {children}
                                </ul>
                            ),
                            li: ({ children }) => (
                                <li style={{ margin: "2px 0" }}>{children}</li>
                            ),
                        }}
                    >
                        {message.text}
                    </ReactMarkdown>
                </MessageBubble>
                <Timestamp sender="user">
                    {formatTime(message.timestamp)}
                </Timestamp>
            </MessageWrapper>
        );
    } else {
        return (
            <BotMessageWrapper>
                <BotIcon />
                <MessageWrapper>
                    <MessageBubble sender={message.sender}>
                        <ReactMarkdown
                            components={{
                                p: ({ children }) => (
                                    <span style={{ margin: 0 }}>
                                        {children}
                                    </span>
                                ),
                                strong: ({ children }) => (
                                    <strong style={{ fontWeight: "bold" }}>
                                        {children}
                                    </strong>
                                ),
                                ol: ({ children }) => (
                                    <ol
                                        style={{
                                            margin: "4px 0",
                                            paddingLeft: "16px",
                                        }}
                                    >
                                        {children}
                                    </ol>
                                ),
                                ul: ({ children }) => (
                                    <ul
                                        style={{
                                            margin: "4px 0",
                                            paddingLeft: "16px",
                                        }}
                                    >
                                        {children}
                                    </ul>
                                ),
                                li: ({ children }) => (
                                    <li style={{ margin: "2px 0" }}>
                                        {children}
                                    </li>
                                ),
                            }}
                        >
                            {message.text}
                        </ReactMarkdown>
                    </MessageBubble>
                    <Timestamp sender="bot">
                        {formatTime(message.timestamp)}
                    </Timestamp>
                </MessageWrapper>
            </BotMessageWrapper>
        );
    }
};

export default MessageBubbleComponent;
