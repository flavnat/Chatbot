import React from "react";
import { AutoComplete } from "antd";
import { SendOutlined } from "@ant-design/icons";
import { SendButton, ChatFooter } from "../ChatBotWidget.styles";

const ChatInput = ({
    inputValue,
    autoCompleteData,
    limitReached,
    onInputChange,
    onAutoCompleteSelect,
    onSend,
}) => {
    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            onSend();
        }
    };

    return (
        <ChatFooter>
            <div style={{ flex: 1, position: "relative" }}>
                <AutoComplete
                    value={inputValue}
                    options={autoCompleteData}
                    onChange={onInputChange}
                    onSelect={onAutoCompleteSelect}
                    onKeyDown={handleKeyDown}
                    placeholder={
                        limitReached
                            ? "Monthly limit reached. Contact support at linkbuilders.support@gmail.com"
                            : "Type a message..."
                    }
                    disabled={limitReached}
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
            </div>
            <SendButton
                type="primary"
                icon={<SendOutlined />}
                onClick={onSend}
                disabled={limitReached}
            />
        </ChatFooter>
    );
};

export default ChatInput;
