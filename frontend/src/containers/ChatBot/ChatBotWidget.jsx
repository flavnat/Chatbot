import React, { useEffect, useRef, useState, useCallback } from "react";
import { AutoComplete } from "antd";
import {
   SendOutlined,
   CommentOutlined,
   BookOutlined,
   QuestionCircleOutlined,
   LikeOutlined,
   DislikeOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { clearMessages, sendMessage, updateUserReaction } from "./actions";
import {
    ADD_MESSAGE,
    CLEAR_MESSAGES,
    LOAD_MESSAGES_FROM_STORAGE,
} from "./constants";
import { chatService } from "../../services/chatService";
import { suggestedQuestions } from "./chatBotData";
import FloatingButton from "./components/FloatingButton";
import ChatHeader from "./components/ChatHeader";
import MessageList from "./components/MessageList";
import TypingIndicator from "./components/TypingIndicator";
import ChatInput from "./components/ChatInput";
import SuggestedQuestions from "./components/SuggestedQuestions";
import ResourcesTab from "./components/ResourcesTab";
import FaqTab from "./components/FaqTab";
import {
   ChatPanel,
   ChatBody,
   ChatFooter,
   SendButton,
   StyledTabs,
   TabContent,
   LikeIconsWrapper,
   ReactionButton,
} from "./ChatBotWidget.styles";

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

// Get dynamic suggested questions from templates
const getSuggestedQuestions = (templates) => {
   if (!Array.isArray(templates) || templates.length === 0) {
      return suggestedQuestions;
   }
   return templates
      .slice(0, 4)
        .map(
            (template) =>
                template.messages?.[0]?.content ||
                template.name ||
                "Ask me anything!"
        );
};

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
   const [relatedQuestions, setRelatedQuestions] = useState([]);
   const [displayedRelatedQuestions, setDisplayedRelatedQuestions] = useState([]);
   const [_templates, _setTemplates] = useState([]);
   const [_templatesLoading, _setTemplatesLoading] = useState(false);
   const dispatch = useDispatch();
    const { messages, typing, limitReached } = useSelector(
        (state) => state.chatBot
    );
   const messagesEndRef = useRef(null);
   const smartSuggestionsRef = useRef(null);
   const [activeTab, setActiveTab] = useState("chat");

   const handleReaction = useCallback(
      (messageId, reaction, event) => {
         event?.preventDefault();
         dispatch(updateUserReaction(messageId, reaction));
      },
      [dispatch]
   );

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
                console.error(
                    "Error loading messages from localStorage:",
                    error
                );
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

   // Fetch conversation templates on component mount
   useEffect(() => {
      const fetchTemplates = async () => {
         try {
            _setTemplatesLoading(true);
            const templateData = await chatService.getTemplates();
            // Extract the templates array from the response
                const templates = templateData.success
                    ? templateData.data.templates
                    : [];
            _setTemplates(templates);
         } catch (error) {
            console.error("Failed to fetch conversation templates:", error);
            _setTemplates([]); // Set empty array on error
         } finally {
            _setTemplatesLoading(false);
         }
      };

      fetchTemplates();
   }, []);

   const shouldShowSuggestedQuestions = () => {
      return true && !typing;
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

   // ✅ NEW: Sync displayed related questions with state changes
   useEffect(() => {
      setDisplayedRelatedQuestions(relatedQuestions);
   }, [relatedQuestions]);

   const handleSend = async () => {
      const sent_input = inputValue;
      setInputValue("");
      if (sent_input.trim() && !typing) {
         try {
            dispatch(sendMessage(inputValue.trim()));
            const result = await chatService.sendMessage({
               message: sent_input.trim(),
               provider: "gemini",
               useRag: true,
               topK: 5,
            });

            if (result.success) {
               setRelatedQuestions(result.relatedQuestions || ["1", "2", "3", "4"]);
               if (isFirstVisit) setIsFirstVisit(false);
            } else {
               dispatch(sendMessage(inputValue.trim()));
            }
         } catch (error) {
            dispatch(sendMessage(inputValue.trim()));
         }
         setAutoCompleteData([]);
         setShowSmartSuggestions(false);
      }
   };
   const handleClear = () => {
      dispatch(clearMessages());
      localStorage.removeItem("chatbot_messages"); // Clear localStorage when messages are cleared
      setIsFirstVisit(true);
      setInputValue("");
      setAutoCompleteData([]);
      setShowSmartSuggestions(false);
      setRelatedQuestions([]);
   };

   const handleSuggestedQuestionClick = async (question) => {
      if (limitReached) return;

      try {
         // setInputValue(question);

         // Send the question through the same API flow as typed messages
         dispatch(sendMessage(question.trim()));
         const result = await chatService.sendMessage({
            message: question.trim(),
            provider: "gemini",
            useRag: true,
            topK: 5,
         });

         setIsFirstVisit(false);
         if (result.success) {
            setRelatedQuestions(result.relatedQuestions || []);
            if (isFirstVisit) setIsFirstVisit(false);
         } else {
            // console.error("API call failed:", result.error);
            dispatch(sendMessage(question.trim()));
         }
      } catch (error) {
         // console.error("Error sending suggested question:", error);
         dispatch(sendMessage(question.trim()));
      }
   };

   const formatTime = (timestamp) => {
      return new Date(timestamp).toLocaleTimeString([], {
         hour: "2-digit",
         minute: "2-digit",
      });
   };

   const questions = getSuggestedQuestions(_templates);

   return (
      <>
         <FloatingButton isOpen={isOpen} onClick={() => setIsOpen(!isOpen)} />
         {isOpen && (
            <ChatPanel>
               <ChatHeader onClear={handleClear} onClose={() => setIsOpen(false)} />
               <StyledTabs
                  activeKey={activeTab}
                  onChange={(key) => setActiveTab(key)}
                  centered
                  items={[
                     {
                        key: "chat",
                        label: (
                           <TabContent>
                              <CommentOutlined
                                 style={{
                                    marginRight: "8px",
                                    fontSize: "16px",
                                 }}
                              />
                              {/* Chat*/}
                           </TabContent>
                        ),
                     },
                     {
                        key: "resources",
                        label: (
                           <TabContent>
                              <BookOutlined
                                 style={{
                                    marginRight: "8px",
                                    fontSize: "16px",
                                 }}
                              />
                              {/* Resources*/}
                           </TabContent>
                        ),
                     },
                     {
                        key: "faq",
                        label: (
                           <TabContent>
                              <QuestionCircleOutlined
                                 style={{
                                    marginRight: "8px",
                                    fontSize: "16px",
                                 }}
                              />
                              {/*FAQ*/}
                           </TabContent>
                        ),
                     },
                  ]}
               />
               {activeTab === "chat" && (
                  <>
                     <ChatBody>
                        <MessageList
                           messages={messages}
                           messagesEndRef={messagesEndRef}
                           formatTime={formatTime}
                           handleReaction={handleReaction}
                        />
                        {typing && <TypingIndicator />}
                        {shouldShowSuggestedQuestions() && !limitReached && (
                           <SuggestedQuestions
                              questions={questions}
                              onQuestionClick={handleSuggestedQuestionClick}
                              relatedQuestions={displayedRelatedQuestions}
                              isFirst={isFirstVisit}
                           />
                        )}
                     </ChatBody>
                     <ChatFooter>
                        <ChatInput
                           inputValue={inputValue}
                           autoCompleteData={autoCompleteData}
                           showSmartSuggestions={showSmartSuggestions}
                           smartSuggestions={getSmartSuggestions(messages)}
                           limitReached={limitReached}
                           typing={typing}
                           onInputChange={handleInputChange}
                           onAutoCompleteSelect={handleAutoCompleteSelect}
                           onSmartSuggestionClick={handleSmartSuggestionClick}
                           onSend={handleSend}
                           smartSuggestionsRef={smartSuggestionsRef}
                        />
                     </ChatFooter>
                  </>
               )}{" "}
               {activeTab === "resources" && <ResourcesTab />}
               {activeTab === "faq" && <FaqTab />}
            </ChatPanel>
         )}
      </>
   );
};

export default ChatBotWidget;
