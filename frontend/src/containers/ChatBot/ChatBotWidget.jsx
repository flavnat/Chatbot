import {
  ClearOutlined,
  CloseOutlined,
  MessageOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { Button, Input } from "antd";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useDispatch, useSelector } from "react-redux";
import styled, { keyframes } from "styled-components";
import { clearMessages, sendMessage } from "./actions";

const FloatingButton = styled(Button)`
  position: fixed;
  bottom: 20px;
  right: 20px;
  border-radius: 50%;
  scale: 1.2;
  background: #343750;
  color: white;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
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
  /* background: radial-gradient(circle at 0% 0.8%, #e6f7ff 0%, transparent 76.2%),
    radial-gradient(circle at 38.3% 76.3%, #f0f9ff 0%, transparent 53.3%),
    radial-gradient(circle at 47.2% 85.6%, #fafafa 0%, transparent 43.4%),
    radial-gradient(circle at 3.6% 10.1%, #ffffff 0%, transparent 64.4%),
    radial-gradient(circle at 9.8% 98.3%, #f5f5f5 0%, transparent 43.4%),
    radial-gradient(circle at 70.5% 28.2%, #fafafa 0%, transparent 34.5%),
    #ffffff; */
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
  background: #343750;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;

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
  background: inherit;
`;

const UserIcon = styled.div`
  background-color: #1890ff;
  width: 32px;
  height: 32px;
  border-radius: 100%;
  font-size: 18px;
  color: white;
  flex-shrink: 0;
  margin-top: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Timestamp = styled.div`
  font-size: 10px;
  margin: 0 2px;
  color: #888;
  text-align: right;
  margin-top: 4px;
  ${(props) =>
    props.sender === "user" ? "text-align: right;" : "text-align: left"}
`;

const ChatFooter = styled.div`
  padding: 10px;
  background: white;
  display: flex;
  gap: 6px;
  align-items: center;
`;

const MessageBubble = styled.div`
  max-width: 80%;
  padding: 8px 12px;
  font-size: 13px;
  line-height: 1.4;
  word-wrap: break-word;
  border-radius: 8px;
  transition: all 0.2s ease;

  ${(props) =>
    props.sender === "user"
      ? `
        background: #f2f8ff;
        color: black;
        align-self: flex-end;
        margin-left: auto;
        text-align: right;
    `
      : `
        background: #FFF1F0;
        color: black;
        align-self: flex-start;
    `}
`;

const BotMessageWrapper = styled.div`
  display: flex;
  align-items: start;
  gap: 8px;
  margin-bottom: 6px;
  align-self: flex-start;
`;

const TypingMessageWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  align-self: flex-start;
`;

const BotIcon = styled.div`
  background-color: white;
  background-image: url("/logo.svg");
  background-size: 80% 80%;
  background-repeat: no-repeat;
  background-position: center;
  width: 32px;
  height: 32px;
  border-radius: 100%;
  font-size: 18px;
  color: black;
  flex-shrink: 0;
  margin-top: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #ddd;
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
  border-radius: 8px;
  align-self: flex-center;
  font-size: 12px;

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
  border: 1px solid #3aaaff;
  border-radius: 8px;
  font-size: 13px;

  &:focus,
  &:hover {
    border: 2px solid #3aaaff;
    box-shadow: none;
  }
`;

const HeaderCleanButton = styled(Button)`
  color: #dfd9d9;

  &:hover {
    color: #f6a1c7 !important;
  }
`;

const HeaderCloseButton = styled(Button)`
  color: #fae8f0;

  &:hover {
    color: #f6a1c7 !important;
  }
`;

const SendButton = styled(Button)`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #3aaaff;
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

const MessageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 10px;
`;

const HeaderLogoCard = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const IconWrapper = styled.div`
  position: relative;
  width: 32px;
  height: 32px;
`;

const Icon = styled.img`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
`;

const ActiveIndicator = styled.div`
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 10px;
  height: 10px;
  background: #4caf50;
  border: 2px solid #3b4a60;
  border-radius: 50%;
`;

const BotName = styled.h3`
  font-size: 15px;
  font-weight: 600;
  margin: 0;
  color: white;
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

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <FloatingButton
        type="primary"
        icon={isOpen ? <CloseOutlined /> : <MessageOutlined />}
        onClick={() => setIsOpen(!isOpen)}
      />
      {isOpen && (
        <ChatPanel>
          <ChatHeader>
            <HeaderLogoCard>
              <IconWrapper>
                <Icon src="/logo.svg" alt="Bot Icon" />
                <ActiveIndicator />
              </IconWrapper>
              <BotName>LB Assistant</BotName>
            </HeaderLogoCard>
            <div style={{ display: "flex", gap: "2px" }}>
              <HeaderCleanButton
                type="text"
                icon={<ClearOutlined style={{ fontSize: 18 }} />}
                onClick={handleClear}
                title="Clear chat"
              />
              <HeaderCloseButton
                type="text"
                icon={<CloseOutlined style={{ fontSize: 18 }} />}
                onClick={() => setIsOpen(false)}
              />
            </div>
          </ChatHeader>
          <ChatBody>
            <MessagesContainer>
              {messages.map((message) => (
                <div key={message.id}>
                  {message.sender === "user" ? (
                    <MessageWrapper>
                      <MessageBubble sender={message.sender}>
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => (
                              <span
                                style={{
                                  margin: 0,
                                }}
                              >
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
                              <li
                                style={{
                                  margin: "2px 0",
                                }}
                              >
                                {children}
                              </li>
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
                  ) : (
                    <BotMessageWrapper>
                      <BotIcon />
                      <MessageWrapper>
                        <MessageBubble sender={message.sender}>
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => (
                                <span
                                  style={{
                                    margin: 0,
                                  }}
                                >
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
                                <li
                                  style={{
                                    margin: "2px 0",
                                  }}
                                >
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
                  )}
                </div>
              ))}
              {typing && (
                <TypingMessageWrapper>
                  <BotIcon />
                  <TypingIndicator>
                    <div className="dot"></div>
                    <div className="dot"></div>
                    <div className="dot"></div>
                  </TypingIndicator>
                </TypingMessageWrapper>
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
