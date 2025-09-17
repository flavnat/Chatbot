import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Input } from "antd";
import {
    MessageOutlined,
    CloseOutlined,
    SendOutlined,
    ClearOutlined,
} from "@ant-design/icons";
import styled, { keyframes } from "styled-components";
import ReactMarkdown from "react-markdown";
import { sendMessage, clearMessages } from "./actions";

const FloatingButton = styled(Button)`
    position: fixed;
    bottom: 20px;
    right: 20px;
    border-radius: 50%;
    scale: 1.2;
    background: white;
    border: 1px dashed black;
    color: black;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    transition: all 0.2s ease;
    z-index: 1000;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);

    transition: all 0.2s ease;

    &:hover {
        background: black;
        color: white;
        transform: scale(1.1);
    }

    &:focus {
        outline: none;
    }
`;

const ChatPanel = styled.div`
    position: fixed;
    bottom: 80px;
    right: 20px;
    width: 320px;
    height: 420px;
    background: white;
    border: 1px dashed black;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    z-index: 999;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    overflow: hidden;
    animation: slideUp 0.3s ease forwards;

    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;

const ChatHeader = styled.div`
    padding: 12px;
    background: black;
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px dashed white;

    h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 500;
    }
`;

const ChatBody = styled.div`
    flex: 1;
    padding: 12px;
    overflow-y: auto;
    background: white;
    border-bottom: 1px dashed black;
`;

const ChatFooter = styled.div`
    padding: 10px;
    background: white;
    display: flex;
    gap: 6px;
    align-items: center;
    border-top: 1px dashed black;
`;

const MessageBubble = styled.div`
    max-width: 75%;
    padding: 8px 12px;
    font-size: 13px;
    line-height: 1.4;
    word-wrap: break-word;
    margin-bottom: 6px;
    border: 1px dashed black;
    border-radius: 8px;
    transition: all 0.2s ease;

    ${(props) =>
        props.sender === "user"
            ? `
        background: black;
        color: white;
        align-self: flex-end;
        margin-left: auto;
    `
            : `
        background: white;
        color: black;
        align-self: flex-start;
    `}
`;

const MessagesContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const bounce = keyframes`
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
`;

const TypingIndicator = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
    background: white;
    border: 1px dashed black;
    border-radius: 8px;
    align-self: flex-start;
    font-size: 12px;
    color: black;

    .dot {
        width: 6px;
        height: 6px;
        background: black;
        border-radius: 50%;
        animation: ${bounce} 1.4s infinite ease-in-out;
    }
    .dot:nth-child(2) {
        animation-delay: 0.2s;
    }
    .dot:nth-child(3) {
        animation-delay: 0.4s;
    }
`;

const StyledInput = styled(Input)`
    border: 1px dashed black;
    border-radius: 8px;
    font-size: 13px;

    &:focus,
    &:hover {
        border-color: black;
        box-shadow: none;
    }
`;

const HeaderButton = styled(Button)`
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: white;
    border: 1px dashed black;
    color: black;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    transition: all 0.2s ease;

    &:hover {
        background: white;
        padding: 2px;
        color: blue;
        border: 2px dashed white;
    }
`;

const SendButton = styled(Button)`
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: black;
    border: 1px dashed black;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    transition: all 0.2s ease;

    &:hover {
        background: white;
        color: black;
    }
`;

const ChatBotWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const dispatch = useDispatch();
    const { messages, typing } = useSelector((state) => state.chatBot);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = () => {
        if (inputValue.trim()) {
            dispatch(sendMessage(inputValue.trim()));
            setInputValue("");
        }
    };

    const handleClear = () => {
        dispatch(clearMessages());
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            handleSend();
        }
    };

    return (
        <>
            <FloatingButton
                type="primary"
                icon={<MessageOutlined />}
                onClick={() => setIsOpen(!isOpen)}
            />
            {isOpen && (
                <ChatPanel>
                    <ChatHeader>
                        <h3>Linkbuilder Chatbot</h3>
                        <div style={{ display: "flex", gap: "5px" }}>
                            <HeaderButton
                                type="text"
                                icon={<ClearOutlined />}
                                onClick={handleClear}
                                title="Clear chat"
                            />
                            <HeaderButton
                                type="text"
                                icon={<CloseOutlined />}
                                onClick={() => setIsOpen(false)}
                            />
                        </div>
                    </ChatHeader>
                    <ChatBody>
                        <MessagesContainer>
                            {messages.map((message) => (
                                <MessageBubble
                                    key={message.id}
                                    sender={message.sender}
                                >
                                    <ReactMarkdown
                                        components={{
                                            p: ({ children }) => (
                                                <span style={{ margin: 0 }}>
                                                    {children}
                                                </span>
                                            ),
                                            strong: ({ children }) => (
                                                <strong
                                                    style={{
                                                        fontWeight: "bold",
                                                    }}
                                                >
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
                            ))}
                            {typing && (
                                <TypingIndicator>
                                    <div className="dot"></div>
                                    <div className="dot"></div>
                                    <div className="dot"></div>
                                </TypingIndicator>
                            )}
                            <div ref={messagesEndRef} />
                        </MessagesContainer>
                    </ChatBody>
                    <ChatFooter>
                        <StyledInput
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onPressEnter={handleKeyPress}
                            placeholder="Type a message..."
                        />
                        <SendButton
                            type="primary"
                            icon={<SendOutlined />}
                            onClick={handleSend}
                        />
                    </ChatFooter>
                </ChatPanel>
            )}
        </>
    );
};

export default ChatBotWidget;
