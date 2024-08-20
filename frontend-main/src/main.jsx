import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { AuthProvider } from "./authContext.jsx";
import { ThemeProvider } from "./hooks/useTheme.jsx";
import { BrowserRouter as Router } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <App />
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "var(--color-bg-secondary)",
                  color: "var(--color-text-primary)",
                  border: "1px solid var(--color-border)",
                },
                success: { iconTheme: { primary: "#238636", secondary: "#fff" } },
                error: { iconTheme: { primary: "#da3633", secondary: "#fff" } },
              }}
            />
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
