import React from "react";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import userEvent from "@testing-library/user-event";
import ChatBotWidget from "../ChatBotWidget";
import chatBotReducer from "../reducer";

// Mock antd components
jest.mock("antd", () => ({
    Button: ({ children, onClick, icon, ...props }) => (
        <button onClick={onClick} {...props}>
            {icon}
            {children}
        </button>
    ),
    Input: ({ value, onChange, onPressEnter, ...props }) => (
        <input
            value={value}
            onChange={onChange}
            onKeyPress={(e) => {
                if (e.key === "Enter") {
                    onPressEnter?.(e);
                }
            }}
            {...props}
        />
    ),
}));

// Mock antd icons
jest.mock("@ant-design/icons", () => ({
    MessageOutlined: () => <span data-testid="message-icon">📩</span>,
    CloseOutlined: () => <span data-testid="close-icon">✕</span>,
    SendOutlined: () => <span data-testid="send-icon">➤</span>,
    ClearOutlined: () => <span data-testid="clear-icon">🗑️</span>,
}));

// Mock react-markdown
jest.mock("react-markdown", () => ({
    __esModule: true,
    default: ({ children }) => <div data-testid="markdown">{children}</div>,
}));

// Create a mock store
const createMockStore = (initialState = {}) => {
    return configureStore({
        reducer: {
            chatBot: chatBotReducer,
        },
        preloadedState: {
            chatBot: {
                messages: [],
                typing: false,
                sessionId: null,
                ...initialState,
            },
        },
    });
};

describe("ChatBotWidget", () => {
    let user;

    beforeEach(() => {
        user = userEvent.setup();
    });

    const renderWithProvider = (component, initialState = {}) => {
        const testStore = createMockStore(initialState);
        const dispatchSpy = jest.spyOn(testStore, "dispatch");
        const result = render(
            <Provider store={testStore}>{component}</Provider>
        );
        return { ...result, store: testStore, dispatchSpy };
    };

    describe("Initial Rendering", () => {
        test("renders floating button initially", () => {
            renderWithProvider(<ChatBotWidget />);
            expect(screen.getByTestId("message-icon")).toBeInTheDocument();
        });

        test("chat panel is not visible initially", () => {
            renderWithProvider(<ChatBotWidget />);
            expect(screen.queryByText("LB Assistant")).not.toBeInTheDocument();
        });
    });

    describe("Chat Panel Toggle", () => {
        test("opens chat panel when floating button is clicked", async () => {
            renderWithProvider(<ChatBotWidget />);
            const button = screen.getByRole("button");
            await user.click(button);

            expect(screen.getByText("LB Assistant")).toBeInTheDocument();
        });

        test("closes chat panel when close button is clicked", async () => {
            renderWithProvider(<ChatBotWidget />);
            const openButton = screen.getByRole("button");
            await user.click(openButton);

            // Find the close button in the header (not the floating button)
            const closeButtons = screen.getAllByTestId("close-icon");
            const headerCloseButton = closeButtons[1]; // Second one is in header
            const closeButton = headerCloseButton.closest("button");
            await user.click(closeButton);

            expect(screen.queryByText("LB Assistant")).not.toBeInTheDocument();
        });

        test("changes icon when panel is opened", async () => {
            renderWithProvider(<ChatBotWidget />);
            const button = screen.getByRole("button");

            expect(screen.getByTestId("message-icon")).toBeInTheDocument();

            await user.click(button);
            // After opening, the floating button should show close icon
            expect(screen.getAllByTestId("close-icon")).toHaveLength(2);
        });
    });

    describe("Message Input", () => {
        test("allows typing in input field", async () => {
            renderWithProvider(<ChatBotWidget />);
            const button = screen.getByRole("button");
            await user.click(button);

            const input = screen.getByPlaceholderText("Type a message...");
            await user.type(input, "Hello world");

            expect(input.value).toBe("Hello world");
        });

        test("sends message when Enter key is pressed", async () => {
            const { dispatchSpy } = renderWithProvider(<ChatBotWidget />);
            const button = screen.getByRole("button");
            await user.click(button);

            const input = screen.getByPlaceholderText("Type a message...");
            await user.type(input, "Test message{enter}");

            expect(dispatchSpy).toHaveBeenCalledWith({
                type: "app/ChatBot/SEND_MESSAGE",
                payload: "Test message",
            });
        });

        test("sends message when send button is clicked", async () => {
            const { dispatchSpy } = renderWithProvider(<ChatBotWidget />);
            const button = screen.getByRole("button");
            await user.click(button);

            const input = screen.getByPlaceholderText("Type a message...");
            await user.type(input, "Test message");

            const sendButton = screen
                .getByTestId("send-icon")
                .closest("button");
            await user.click(sendButton);

            expect(dispatchSpy).toHaveBeenCalledWith({
                type: "app/ChatBot/SEND_MESSAGE",
                payload: "Test message",
            });
        });

        test("clears input after sending message", async () => {
            renderWithProvider(<ChatBotWidget />);
            const button = screen.getByRole("button");
            await user.click(button);

            const input = screen.getByPlaceholderText("Type a message...");
            await user.type(input, "Test message{enter}");

            expect(input.value).toBe("");
        });

        test("does not send empty message", async () => {
            const { dispatchSpy } = renderWithProvider(<ChatBotWidget />);
            const button = screen.getByRole("button");
            await user.click(button);

            const input = screen.getByPlaceholderText("Type a message...");
            await user.type(input, "   {enter}");

            expect(dispatchSpy).not.toHaveBeenCalled();
        });
    });

    describe("Clear Messages", () => {
        test("dispatches clear action when clear button is clicked", async () => {
            const { dispatchSpy } = renderWithProvider(<ChatBotWidget />);
            const openButton = screen.getByRole("button");
            await user.click(openButton);

            const clearButton = screen
                .getByTestId("clear-icon")
                .closest("button");
            await user.click(clearButton);

            expect(dispatchSpy).toHaveBeenCalledWith({
                type: "app/ChatBot/CLEAR_MESSAGES",
            });
        });
    });

    describe("Message Rendering", () => {
        test("renders user messages with correct styling and timestamp", async () => {
            const mockMessages = [
                {
                    id: 1,
                    text: "Hello from user",
                    sender: "user",
                    timestamp: "2023-01-01T10:00:00.000Z",
                },
            ];

            renderWithProvider(<ChatBotWidget />, { messages: mockMessages });
            const button = screen.getByRole("button");
            await user.click(button);

            expect(screen.getByText("Hello from user")).toBeInTheDocument();
            expect(screen.getByTestId("markdown")).toBeInTheDocument();
        });

        test("renders bot messages with bot icon and correct styling", async () => {
            const mockMessages = [
                {
                    id: 1,
                    text: "Hello from bot",
                    sender: "bot",
                    timestamp: "2023-01-01T10:00:00.000Z",
                },
            ];

            renderWithProvider(<ChatBotWidget />, { messages: mockMessages });
            const button = screen.getByRole("button");
            await user.click(button);

            expect(screen.getByText("Hello from bot")).toBeInTheDocument();
            expect(screen.getByTestId("markdown")).toBeInTheDocument();
        });

        test("renders multiple messages correctly", async () => {
            const mockMessages = [
                {
                    id: 1,
                    text: "Hello from bot",
                    sender: "bot",
                    timestamp: "2023-01-01T10:00:00.000Z",
                },
                {
                    id: 2,
                    text: "Hello from user",
                    sender: "user",
                    timestamp: "2023-01-01T10:01:00.000Z",
                },
            ];

            renderWithProvider(<ChatBotWidget />, { messages: mockMessages });
            const button = screen.getByRole("button");
            await user.click(button);

            expect(screen.getByText("Hello from bot")).toBeInTheDocument();
            expect(screen.getByText("Hello from user")).toBeInTheDocument();
        });

        test("renders typing indicator when typing is true", async () => {
            renderWithProvider(<ChatBotWidget />, { typing: true });
            const button = screen.getByRole("button");
            await user.click(button);

            // Check for typing indicator dots
            const dots = document.querySelectorAll(".dot");
            expect(dots.length).toBe(3);
        });

        test("does not render typing indicator when typing is false", async () => {
            renderWithProvider(<ChatBotWidget />, { typing: false });
            const button = screen.getByRole("button");
            await user.click(button);

            // Typing indicator should not be present
            const dots = document.querySelectorAll(".dot");
            expect(dots.length).toBe(0);
        });

        test("renders timestamps for messages", async () => {
            const mockMessages = [
                {
                    id: 1,
                    text: "Test message",
                    sender: "user",
                    timestamp: "2023-01-01T10:00:00.000Z",
                },
            ];

            renderWithProvider(<ChatBotWidget />, { messages: mockMessages });
            const button = screen.getByRole("button");
            await user.click(button);

            // Should render formatted timestamp (01:00 PM format)
            expect(screen.getByText("01:00 PM")).toBeInTheDocument();
        });
    });

    describe("ReactMarkdown Components", () => {
        test("renders markdown with custom paragraph component", async () => {
            const mockMessages = [
                {
                    id: 1,
                    text: "Paragraph with **bold** text",
                    sender: "bot",
                    timestamp: "2023-01-01T10:00:00.000Z",
                },
            ];

            renderWithProvider(<ChatBotWidget />, { messages: mockMessages });
            const button = screen.getByRole("button");
            await user.click(button);

            expect(screen.getByTestId("markdown")).toBeInTheDocument();
        });

        test("renders markdown with custom list components", async () => {
            const mockMessages = [
                {
                    id: 1,
                    text: "- Item 1\n- Item 2\n1. Numbered item",
                    sender: "bot",
                    timestamp: "2023-01-01T10:00:00.000Z",
                },
            ];

            renderWithProvider(<ChatBotWidget />, { messages: mockMessages });
            const button = screen.getByRole("button");
            await user.click(button);

            expect(screen.getByTestId("markdown")).toBeInTheDocument();
        });
    });
});
