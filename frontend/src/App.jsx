import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import { ConfigProvider } from "antd";
import store from "./store/configureStore";
import DefaultLayout from "./containers/DefaultLayout";
import AuthCallback from "./containers/AuthCallback";

function App() {
    return (
        <Provider store={store}>
            <ConfigProvider>
                <Router>
                    <Routes>
                        <Route path="/" element={<DefaultLayout />} />
                        <Route
                            path="/auth/callback"
                            element={<AuthCallback />}
                        />
                    </Routes>
                </Router>
            </ConfigProvider>
        </Provider>
    );
}

export default App;
