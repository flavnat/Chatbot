import React from "react";
import ReactMarkdown from "react-markdown";
import { LikeOutlined, DislikeOutlined } from "@ant-design/icons";
import {
    MessageBubble,
    MessageWrapper,
    Timestamp,
    BotMessageWrapper,
    BotIcon,
    LikeIconsWrapper,
    ReactionButton,
} from "../ChatBotWidget.styles";

const MessageBubbleComponent = ({ message, formatTime, handleReaction }) => {
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
                        <LikeIconsWrapper>
                            <ReactionButton
                                $active={message.userReaction === "like"}
                                onClick={(e) =>
                                    handleReaction(message.id, "like", e)
                                }
                                title="Like this response"
                            >
                                <LikeOutlined
                                    style={{
                                        color:
                                            message.userReaction === "like"
                                                ? "#1890ff"
                                                : "#666",
                                        fontSize: "16px",
                                    }}
                                />
                            </ReactionButton>

                            <ReactionButton
                                $active={message.userReaction === "dislike"}
                                onClick={(e) =>
                                    handleReaction(message.id, "dislike", e)
                                }
                                title="Dislike this response"
                            >
                                <DislikeOutlined
                                    style={{
                                        color:
                                            message.userReaction === "dislike"
                                                ? "#ff4d4f"
                                                : "#666",
                                        fontSize: "16px",
                                        transform: "scaleX(-1)",
                                    }}
                                />
                            </ReactionButton>
                        </LikeIconsWrapper>
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
