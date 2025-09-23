import { combineReducers } from "redux";
import chatBotReducer from "../containers/ChatBot/reducer";
import authReducer from "./authReducer";

export default combineReducers({
    chatBot: chatBotReducer,
    auth: authReducer,
});
