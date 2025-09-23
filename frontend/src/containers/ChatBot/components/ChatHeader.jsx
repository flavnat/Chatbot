import React from "react";
import { ClearOutlined, CloseOutlined } from "@ant-design/icons";
import {
    ChatHeader,
    HeaderLogoCard,
    IconWrapper,
    Icon,
    ActiveIndicator,
    BotName,
    HeaderCleanButton,
    HeaderCloseButton,
} from "../ChatBotWidget.styles";

const ChatHeaderComponent = ({ onClear, onClose }) => {
    return (
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
                    onClick={onClear}
                    title="Clear chat"
                />
                <HeaderCloseButton
                    type="text"
                    icon={<CloseOutlined style={{ fontSize: 18 }} />}
                    onClick={onClose}
                />
            </div>
        </ChatHeader>
    );
};

export default ChatHeaderComponent;
