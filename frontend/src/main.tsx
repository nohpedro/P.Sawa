import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "./app/providers/AuthProvider";
import App from "./app/App";

/* === Styles === */
import "./styles/theme.css";
import "./styles/global.css";
import "./styles/fids.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
