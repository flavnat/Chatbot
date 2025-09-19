import {
  ClearOutlined,
  CloseOutlined,
  MessageOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { Button, Input, AutoComplete, Dropdown, Menu } from "antd";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useDispatch, useSelector } from "react-redux";
import styled, { keyframes } from "styled-components";
import { clearMessages, sendMessage } from "./actions";
import {
  ADD_MESSAGE,
  CLEAR_MESSAGES,
  LOAD_MESSAGES_FROM_STORAGE,
} from "./constants";

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
  bottom: 60px;
  right: 20px;
  width: 320px;
  height: 520px;
  background: radial-gradient(circle at 0% 0.8%, #e6f7ff 0%, transparent 76.2%),
    radial-gradient(circle at 38.3% 76.3%, #f0f9ff 0%, transparent 53.3%),
    radial-gradient(circle at 47.2% 85.6%, #fafafa 0%, transparent 43.4%),
    radial-gradient(circle at 3.6% 10.1%, #ffffff 0%, transparent 64.4%),
    radial-gradient(circle at 9.8% 98.3%, #f5f5f5 0%, transparent 43.4%),
    radial-gradient(circle at 70.5% 28.2%, #fafafa 0%, transparent 34.5%),
    #ffffff;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  z-index: 999;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
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
        border: 1px solid #b7cfea;
        color: black;
        align-self: flex-end;
        margin-left: auto;
        text-align: right;
    `
      : `
        background: #FFF1F0;
        border: 1px solid #fae5e3;
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
  flex: 1;
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

const SuggestedQuestionsContainer = styled.div`
  padding: 12px;
`;

const SuggestedQuestionsGrid = styled.div`
  display: grid;
  gap: 8px;
`;

const SuggestedQuestionItem = styled.div`
  padding: 8px 10px;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  margin-left: auto;
  max-width: 200px;

  &:hover {
    background: #f0f8ff;
    border-color: #3aaaff;
    transform: translateY(-1px);
  }
`;

const suggestedQuestions = [
  "How can I get started?",
  "What services do you offer?",
  "Tell me about pricing",
  "How do I contact support?",
];

// Auto-complete options
const autoCompleteOptions = [
  { value: "pricing", label: "pricing information" },
  { value: "contact", label: "contact support" },
  { value: "help", label: "get help" },
  { value: "services", label: "available services" },
  { value: "features", label: "product features" },
  { value: "demo", label: "schedule a demo" },
  { value: "documentation", label: "view documentation" },
  { value: "tutorial", label: "tutorials and guides" },
];

// Smart suggestions based on context
const getSmartSuggestions = (messages) => {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.sender === "user") return [];

  const botResponse = lastMessage.text.toLowerCase();

  if (botResponse.includes("pricing") || botResponse.includes("cost")) {
    return [
      "What are your payment options?",
      "Do you offer discounts?",
      "Can I get a quote?",
    ];
  }

  if (botResponse.includes("contact") || botResponse.includes("support")) {
    return [
      "What's your response time?",
      "Do you offer phone support?",
      "Can I schedule a call?",
    ];
  }

  if (botResponse.includes("demo") || botResponse.includes("schedule")) {
    return [
      "What time zones do you support?",
      "How long is the demo?",
      "What should I prepare?",
    ];
  }

  return [
    "Tell me more about this",
    "Can you provide an example?",
    "What are the next steps?",
  ];
};

const ChatBotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [autoCompleteData, setAutoCompleteData] = useState([]);
  const [showSmartSuggestions, setShowSmartSuggestions] = useState(false);
  const dispatch = useDispatch();
  const { messages, typing } = useSelector((state) => state.chatBot);
  const messagesEndRef = useRef(null);
  const smartSuggestionsRef = useRef(null);

  const [isFirstVisit, setIsFirstVisit] = useState(true);
  //  close when it click outside the suggestions container i know its bulky implementation fr
  useEffect(() => {
    if (!showSmartSuggestions) return;

    const handleClickOutside = (event) => {
      if (
        smartSuggestionsRef.current &&
        !smartSuggestionsRef.current.contains(event.target)
      ) {
        setShowSmartSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSmartSuggestions]);

  // Load messages from localStorage on component mount
  useEffect(() => {
    const savedMessages = localStorage.getItem("chatbot_messages");
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        // Replace entire state with saved messages
        if (parsedMessages.length > 0) {
          dispatch({
            type: LOAD_MESSAGES_FROM_STORAGE,
            payload: parsedMessages,
          });
        }
      } catch (error) {
        console.error("Error loading messages from localStorage:", error);
      }
    }
  }, [dispatch]);

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 1) {
      // Don't save if only the initial greeting
      localStorage.setItem("chatbot_messages", JSON.stringify(messages));
    }
  }, [messages]);

  const shouldShowSuggestedQuestions = () => {
    return (
      isFirstVisit &&
      messages.length === 1 &&
      messages[0]?.sender === "bot" &&
      messages[0]?.text === "Hello! How can I help you today?"
    );
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleInputChange = (value) => {
    setInputValue(value);

    // Auto-complete logic
    if (value.length > 0) {
      const filteredOptions = autoCompleteOptions.filter(
        (option) =>
          option.value.toLowerCase().includes(value.toLowerCase()) ||
          option.label.toLowerCase().includes(value.toLowerCase())
      );
      setAutoCompleteData(
        filteredOptions.map((option) => ({
          value: option.label,
          label: option.label,
        }))
      );
    } else {
      setAutoCompleteData([]);
    }

    // Show smart suggestions when input is focused and there are messages
    setShowSmartSuggestions(value.length === 0 && messages.length > 0);
  };

  const handleAutoCompleteSelect = (value) => {
    setInputValue(value);
    setAutoCompleteData([]);
    setShowSmartSuggestions(false);
  };

  const handleSmartSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    setShowSmartSuggestions(false);
  };
  const handleSend = () => {
    if (inputValue.trim()) {
      dispatch(sendMessage(inputValue.trim()));
      setInputValue("");
      setAutoCompleteData([]);
      setShowSmartSuggestions(false);
      if (isFirstVisit) {
        setIsFirstVisit(false);
      }
    }
  };

  const handleClear = () => {
    dispatch(clearMessages());
    localStorage.removeItem("chatbot_messages"); // Clear localStorage when messages are cleared
    setIsFirstVisit(true);
    setInputValue("");
    setAutoCompleteData([]);
    setShowSmartSuggestions(false);
  };

  const handleSuggestedQuestionClick = (question) => {
    setInputValue(question);
    dispatch(sendMessage(question));
    setIsFirstVisit(false);
    setInputValue("");
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

            {shouldShowSuggestedQuestions() && (
              <SuggestedQuestionsContainer>
                <SuggestedQuestionsGrid>
                  {suggestedQuestions.map((question, index) => (
                    <SuggestedQuestionItem
                      key={index}
                      onClick={() => handleSuggestedQuestionClick(question)}
                    >
                      {question}
                    </SuggestedQuestionItem>
                  ))}
                </SuggestedQuestionsGrid>
              </SuggestedQuestionsContainer>
            )}
          </ChatBody>
          <ChatFooter>
            <div style={{ flex: 1, position: "relative" }}>
              <AutoComplete
                value={inputValue}
                options={autoCompleteData}
                onChange={handleInputChange}
                onSelect={handleAutoCompleteSelect}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSend();
                  }
                }}
                placeholder="Type a message..."
                style={{
                  width: "100%",
                  border: "1px solid #3aaaff",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
                styles={{
                  popup: {
                    root: {
                      borderRadius: "8px",
                      border: "1px solid #3aaaff",
                    },
                  },
                }}
              />
              {showSmartSuggestions &&
                getSmartSuggestions(messages).length > 0 && (
                  <div
                    ref={smartSuggestionsRef}
                    style={{
                      position: "absolute",
                      top: "-140px",
                      left: 0,
                      right: 0,
                      background: "white",
                      border: "1px solid #e8e8e8",
                      borderRadius: "8px",
                      padding: "8px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      zIndex: 1000,
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#666",
                        marginBottom: "4px",
                      }}
                    >
                      💡 Smart suggestions:
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      {getSmartSuggestions(messages).map(
                        (suggestion, index) => (
                          <div
                            key={index}
                            onClick={() =>
                              handleSmartSuggestionClick(suggestion)
                            }
                            style={{
                              padding: "6px 8px",
                              background: "#f8f9fa",
                              borderRadius: "4px",
                              fontSize: "12px",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) =>
                              (e.target.style.background = "#e6f7ff")
                            }
                            onMouseLeave={(e) =>
                              (e.target.style.background = "#f8f9fa")
                            }
                          >
                            {suggestion}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
            </div>
            <SendButton
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              disabled={typing}
            />
          </ChatFooter>
        </ChatPanel>
      )}
    </>
  );
};

export default ChatBotWidget;
