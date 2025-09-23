import React from "react";
import {
    TypingIndicator,
    TypingMessageWrapper,
    BotIcon,
} from "../ChatBotWidget.styles";
import {
    SendOutlined,
    CommentOutlined,
    BookOutlined,
    QuestionCircleOutlined,
} from "@ant-design/icons";

const TypingIndicatorComponent = () => {
    return (
        <TypingMessageWrapper>
            <BotIcon />
            <TypingIndicator>
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
            </TypingIndicator>
        </TypingMessageWrapper>
    );
};

export default TypingIndicatorComponent;
