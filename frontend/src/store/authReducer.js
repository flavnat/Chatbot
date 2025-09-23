const initialState = {
    user: null,
    sessionKey: localStorage.getItem("sessionKey") || null,
    loading: false,
    error: null,
};

const authReducer = (state = initialState, action) => {
    switch (action.type) {
        case "LOGIN_REQUEST":
            return { ...state, loading: true, error: null };
        case "LOGIN_SUCCESS":
            localStorage.setItem("sessionKey", action.payload.sessionKey);
            return {
                ...state,
                loading: false,
                user: action.payload.user,
                sessionKey: action.payload.sessionKey,
            };
        case "LOGIN_FAILURE":
            return { ...state, loading: false, error: action.payload };
        case "LOGOUT":
            localStorage.removeItem("sessionKey");
            return { ...state, user: null, sessionKey: null };
        case "SET_USER":
            return { ...state, user: action.payload };
        default:
            return state;
    }
};

export default authReducer;
