import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Input } from "antd";
import {
    MessageOutlined,
    CloseOutlined,
    SendOutlined,
    ClearOutlined,
} from "@ant-design/icons";
import styled from "styled-components";
import ReactMarkdown from "react-markdown";
import { sendMessage, clearMessages } from "./actions";

const FloatingButton = styled(Button)`
    position: fixed;
    bottom: 20px;
    right: 20px;
    scale: 1.2;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    padding: 8px 2px;
    border: 1px dashed black;
    color: black;
    z-index: 1000;

    &:hover {
        background: black;
        color: white;
    }

    &:focus {
        outline: none;
    }
`;

const ChatPanel = styled.div`
    position: fixed;
    bottom: 80px;
    right: 20px;
    width: 300px;
    height: 400px;
    background: white;
    border: 1px dashed black;
    display: flex;
    flex-direction: column;
    z-index: 999;
`;

const ChatHeader = styled.div`
    padding: 10px;
    background: black;
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px dashed white;

    h3 {
        margin: 0;
        font-size: 14px;
        font-weight: normal;
    }
`;

const ChatBody = styled.div`
    flex: 1;
    padding: 10px;
    overflow-y: auto;
    background: white;
    border-bottom: 1px dashed black;
`;

const ChatFooter = styled.div`
    padding: 10px;
    background: white;
    display: flex;
    gap: 5px;
    align-items: center;
`;

const MessageBubble = styled.div`
    max-width: 70%;
    padding: 8px 12px;
    font-size: 12px;
    line-height: 1.4;
    word-wrap: break-word;
    margin-bottom: 5px;
    border: 1px dashed black;

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
`;

const TypingIndicator = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
    background: white;
    border: 1px dashed black;
    align-self: flex-start;
    font-size: 12px;
    color: black;

    .dot {
        width: 4px;
        height: 4px;
        background: black;
    }
`;

const StyledInput = styled(Input)`
    border: 1px dashed black;
    padding: 5px 10px;
    font-size: 12px;

    &:focus,
    &:hover {
        border-color: black;
    }

    .ant-input {
        border: none;
        outline: none;
    }
`;

const SendButton = styled(Button)`
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: black;
    border: 1px dashed black;
    color: white;

    &:hover {
        background: white;
        color: black;
    }

    &:focus {
        outline: none;
    }
`;

const CloseButton = styled(Button)`
    background: black;
    border: 1px dashed white;
    color: white;
    width: 25px;
    height: 25px;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
        background: white;
        color: black;
        border-color: black;
    }

    &:focus {
        outline: none;
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
                        <h3>Linkbuilder Test Chatbot</h3>
                        <div style={{ display: "flex", gap: "5px" }}>
                            <CloseButton
                                type="text"
                                icon={<ClearOutlined />}
                                onClick={handleClear}
                                title="Clear chat"
                            />
                            <CloseButton
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
                                    <span>Bot is typing</span>
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
                            placeholder="Type message..."
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
