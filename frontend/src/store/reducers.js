import { combineReducers } from "redux";
import chatBotReducer from "../containers/ChatBot/reducer";

export default combineReducers({
    chatBot: chatBotReducer,
});
