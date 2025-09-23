import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";

const AuthCallback = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const handleCallback = async () => {
            const sessionKey = searchParams.get("sessionKey");
            if (sessionKey) {
                localStorage.setItem("sessionKey", sessionKey);
                try {
                    const response = await api.get("/auth/me");
                    dispatch({
                        type: "LOGIN_SUCCESS",
                        payload: { user: response.data.user, sessionKey },
                    });
                    navigate("/");
                } catch (error) {
                    console.error("Auth callback error:", error);
                    dispatch({
                        type: "LOGIN_FAILURE",
                        payload: "Failed to get user info",
                    });
                    navigate("/");
                }
            } else {
                dispatch({
                    type: "LOGIN_FAILURE",
                    payload: "No session key",
                });
                navigate("/");
            }
        };

        handleCallback();
    }, [dispatch, navigate, searchParams]);

    return <div>Loading...</div>;
};

export default AuthCallback;
