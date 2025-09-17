import React from "react";
import styled from "styled-components";
import ChatBotWidget from "../ChatBot/index.js";

const LayoutContainer = styled.div`
    min-height: 100vh;
    background: white;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: "Arial", sans-serif;
    margin: 10px;
`;

const DefaultLayout = () => {
    return (
        <LayoutContainer>
            <ChatBotWidget />
        </LayoutContainer>
    );
};

export default DefaultLayout;
