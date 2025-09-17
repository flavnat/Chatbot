import { all } from "redux-saga/effects";
import chatBotSaga from "../containers/ChatBot/saga";

export default function* rootSaga() {
    yield all([chatBotSaga()]);
}
