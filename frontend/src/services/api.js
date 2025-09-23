import axios from "axios";

// Create axios instance with base configuration
const api = axios.create({
    baseURL: "http://localhost:3000/api",
    timeout: 90000, // 90 seconds timeout for long-running AI requests (increased from 30s)
    headers: {
        "Content-Type": "application/json",
    },
});

// Request interceptor for adding auth tokens if needed
api.interceptors.request.use(
    (config) => {
        // Add session key
        const sessionKey = localStorage.getItem("sessionKey");
        if (sessionKey) {
            config.headers["x-session-key"] = sessionKey;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for handling common errors
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Handle common error cases
        if (error.response) {
            // Server responded with error status
            const { status, data } = error.response;

            switch (status) {
                case 400:
                    console.error("Bad Request:", data);
                    break;
                case 401:
                    console.error("Unauthorized:", data);
                    // Handle unauthorized access
                    break;
                case 403:
                    console.error("Forbidden:", data);
                    break;
                case 404:
                    console.error("Not Found:", data);
                    break;
                case 429:
                    console.error("Rate Limited:", data);
                    break;
                case 500:
                    console.error("Internal Server Error:", data);
                    break;
                default:
                    console.error("API Error:", data);
            }
        } else if (error.request) {
            // Network error
            console.error("Network Error:", error.message);
        } else {
            // Other error
            console.error("Request Error:", error.message);
        }

        return Promise.reject(error);
    }
);

export default api;
