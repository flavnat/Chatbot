import styled, { keyframes } from "styled-components";
import { Button, Input, Tabs } from "antd";

export const FloatingButton = styled(Button)`
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

export const ChatPanel = styled.div`
    position: fixed;
    bottom: 60px;
    right: 20px;
    width: 320px;
    height: 520px;
    background: radial-gradient(
            circle at 0% 0.8%,
            #e6f7ff 0%,
            transparent 76.2%
        ),
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

export const ChatHeader = styled.div`
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

export const ChatBody = styled.div`
    flex: 1;
    padding: 12px;
    overflow-y: auto;
    background: inherit;
`;

export const Timestamp = styled.div`
    font-size: 10px;
    margin: 0 2px;
    color: #888;
    text-align: right;
    margin-top: 4px;
    ${(props) =>
        props.sender === "user" ? "text-align: right;" : "text-align: left"}
`;

export const ChatFooter = styled.div`
    padding: 10px;
    background: white;
    display: flex;
    gap: 6px;
    align-items: center;
    width: 100%;
`;

export const MessageBubble = styled.div`
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

export const BotMessageWrapper = styled.div`
    display: flex;
    align-items: start;
    gap: 8px;
    margin-bottom: 6px;
    align-self: flex-start;
`;

export const TypingMessageWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    align-self: flex-start;
`;

export const BotIcon = styled.div`
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

export const MessagesContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
`;

export const bounce = keyframes`
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
`;

export const TypingIndicator = styled.div`
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

export const StyledInput = styled(Input)`
    border: 1px solid #3aaaff;
    border-radius: 8px;
    font-size: 13px;

    &:focus,
    &:hover {
        border: 2px solid #3aaaff;
        box-shadow: none;
    }
`;

export const HeaderCleanButton = styled(Button)`
    color: #dfd9d9;

    &:hover {
        color: #f6a1c7 !important;
    }
`;

export const HeaderCloseButton = styled(Button)`
    color: #fae8f0;

    &:hover {
        color: #f6a1c7 !important;
    }
`;

export const SendButton = styled(Button)`
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

export const StyledTabs = styled(Tabs)`
    .ant-tabs-nav {
        margin-bottom: 16px;
        border-bottom: 2px solid #f0f0f0;
    }

    .ant-tabs-tab {
        flex: 1;
        justify-content: center;
        margin: 0;
        padding: 8px 16px;
        transition: all 0.3s ease;
    }

    .ant-tabs-tab-active {
        font-weight: 600;
    }

    .ant-tabs-ink-bar {
        background: #1890ff;
    }
`;

export const TabContent = styled.div`
    display: flex;
    align-items: center;
    height: 30px;
    justify-content: center;
    width: 100%;
    color: ${(props) => (props.active ? "#1890ff" : "#000000")};
    font-weight: ${(props) => (props.active ? "600" : "400")};
`;

export const MessageWrapper = styled.div`
    display: flex;
    flex-direction: column;
    margin-bottom: 10px;
`;

export const HeaderLogoCard = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

export const IconWrapper = styled.div`
    position: relative;
    width: 32px;
    height: 32px;
`;

export const Icon = styled.img`
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
`;

export const ActiveIndicator = styled.div`
    position: absolute;
    bottom: 2px;
    right: 2px;
    width: 10px;
    height: 10px;
    background: #4caf50;
    border: 2px solid #3b4a60;
    border-radius: 50%;
`;

export const BotName = styled.h3`
    font-size: 15px;
    font-weight: 600;
    margin: 0;
    color: white;
`;

export const SuggestedQuestionsContainer = styled.div`
    padding: 12px;
`;

export const SuggestedQuestionsGrid = styled.div`
    display: grid;
    gap: 8px;
`;

export const SuggestedQuestionItem = styled.div`
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

export const ResourcesContainer = styled.div`
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-height: 400px;
    overflow-y: auto;
`;

export const ResourcesGrid = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

export const ResourceCard = styled.div`
    background: #ffffff;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    gap: 8px;
    cursor: pointer;

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    }

    h5 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #1890ff;
    }

    p {
        font-size: 12px;
        color: #555;
        line-height: 1.4;
        margin: 0;
    }

    .resource-icon {
        font-size: 20px;
        color: #1890ff;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #e6f0ff;
    }
`;

export const SuggestedResources = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;

    h5 {
        margin-bottom: 8px;
        font-size: 15px;
        font-weight: 600;
        color: #1890ff;
    }

    .resource-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .resource-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #f5f8ff;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;

        &:hover {
            background: #e6f0ff;
        }

        &.read {
            opacity: 0.6;
        }

        .resource-type {
            font-size: 18px;
            color: #1890ff;
            margin-right: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .unread-indicator {
            width: 10px;
            height: 10px;
            background: #ff4d4f;
            border-radius: 50%;
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
        }
    }
`;

export const FaqContainer = styled.div`
    padding: 16px;
    max-height: 400px;
    overflow-y: auto;

    .faq-collapse {
        background: transparent;
        border: none;

        .ant-collapse-item {
            margin-bottom: 8px;
            border: 1px solid #e8e8e8;
            border-radius: 8px;
            overflow: hidden;

            .ant-collapse-header {
                padding: 12px 16px;
                font-size: 14px;
                font-weight: 500;
                color: #1890ff;
                background: #f8f9fa;

                &:hover {
                    background: #e6f0ff;
                }
            }

            .ant-collapse-content {
                border-top: 1px solid #e8e8e8;
                background: white;

                .ant-collapse-content-box {
                    padding: 12px 16px;
                }
            }
        }

        .ant-collapse-item-active {
            .ant-collapse-header {
                background: #e6f0ff;
                font-weight: 600;
            }
        }
    }
`;

export const FaqItem = styled.div`
    .faq-answer {
        font-size: 13px;
        line-height: 1.5;
        color: #555;
        margin-bottom: 8px;
    }

    .faq-tags {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
    }

    .faq-tag {
        background: #f0f0f0;
        color: #666;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 500;
    }
`;
