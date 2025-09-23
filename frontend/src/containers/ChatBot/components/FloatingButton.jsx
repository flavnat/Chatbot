import React from "react";
import { MessageOutlined, CloseOutlined } from "@ant-design/icons";
import { FloatingButton } from "../ChatBotWidget.styles";

const ChatFloatingButton = ({ isOpen, onClick }) => {
    return (
        <FloatingButton
            type="primary"
            icon={isOpen ? <CloseOutlined /> : <MessageOutlined />}
            onClick={onClick}
        />
    );
};

export default ChatFloatingButton;
