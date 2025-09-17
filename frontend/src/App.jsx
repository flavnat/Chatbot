import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import { ConfigProvider } from "antd";
import store from "./store/configureStore";
import DefaultLayout from "./containers/DefaultLayout";

function App() {
    return (
        <Provider store={store}>
            <ConfigProvider>
                <Router>
                    <Routes>
                        <Route path="/" element={<DefaultLayout />} />
                    </Routes>
                </Router>
            </ConfigProvider>
        </Provider>
    );
}

export default App;
