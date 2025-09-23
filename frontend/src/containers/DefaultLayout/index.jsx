import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import styled from "styled-components";
import ChatBotWidget from "../ChatBot/index.js";

const LayoutContainer = styled.div`
    min-height: 100vh;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: "Segoe UI", Arial, sans-serif;
    padding: 20px;
`;

const Card = styled.div`
    background: white;
    padding: 30px;
    text-align: center;
    max-width: 400px;
    width: 100%;
`;

const LoginButton = styled.button`
    padding: 4px 20px;
    background: #4285f4;
    color: white;
    font-weight: 500;
    border: 2px solid #4285f4;
    border-bottom: 4px solid #357ae8;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    transition: background 0.2s ease, transform 0.1s ease;

    &:hover {
        background: #357ae8;
    }

    &:active {
        transform: scale(0.97);
    }
`;

const LogoutButton = styled.button`
    margin-top: 12px;
    padding: 4px 20px;
    background: #ef4444;
    color: white;
    font-weight: 500;
    border: 2px solid #dc2626;
    border-bottom: 4px solid #ef4444;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.2s ease, transform 0.1s ease;

    &:hover {
        background: #dc2626;
    }

    &:active {
        transform: scale(0.97);
    }
`;

const UserInfo = styled.div`
    margin-bottom: 20px;

    p {
        margin: 6px 0;
        font-size: 15px;
        color: #374151;
    }

    p:first-child {
        font-weight: 600;
        font-size: 1.1rem;
    }
`;

const DefaultLayout = () => {
    const { user, sessionKey } = useSelector((state) => state.auth);
    const dispatch = useDispatch();

    useEffect(() => {
        if (sessionKey && !user) {
            const fetchUser = async () => {
                try {
                    const response = await fetch(
                        "http://localhost:3000/api/auth/me",
                        {
                            headers: {
                                "x-session-key": sessionKey,
                            },
                        }
                    );
                    if (response.ok) {
                        const data = await response.json();
                        dispatch({ type: "SET_USER", payload: data.user });
                    } else {
                        localStorage.removeItem("sessionKey");
                        dispatch({ type: "LOGOUT" });
                    }
                } catch (error) {
                    console.error("Fetch user error:", error);
                    localStorage.removeItem("sessionKey");
                    dispatch({ type: "LOGOUT" });
                }
            };
            fetchUser();
        }
    }, [sessionKey, user, dispatch]);

    const handleLogin = () => {
        window.location.href = "http://localhost:3000/api/auth/google";
    };

    const handleLogout = async () => {
        try {
            await fetch("http://localhost:3000/api/auth/logout", {
                method: "POST",
                credentials: "include",
            });
            dispatch({ type: "LOGOUT" });
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    if (!sessionKey || !user) {
        return (
            <LayoutContainer>
                <Card>
                    <LoginButton onClick={handleLogin}>
                        Login with{" "}
                        <span style={{ fontWeight: "bold" }}>Google</span>
                    </LoginButton>
                </Card>
            </LayoutContainer>
        );
    }

    return (
        <LayoutContainer>
            <Card>
                <UserInfo>
                    <p>👋 Welcome, {user.name}!</p>
                    <p>
                        Monthly usage:{" "}
                        <strong>
                            {user.monthlyUsage.questionsAsked}/
                            {user.monthlyUsage.limit}
                        </strong>
                    </p>
                </UserInfo>
                <LogoutButton onClick={handleLogout}>Logout</LogoutButton>
            </Card>
            <div
                style={{ marginTop: "30px", width: "100%", maxWidth: "800px" }}
            >
                <ChatBotWidget />
            </div>
        </LayoutContainer>
    );
};

export default DefaultLayout;
