import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        gutter={10}
        toastOptions={{
          duration: 5000,
          style: {
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            color: "#111827",
            padding: "12px 14px",
            fontSize: "14px",
            fontWeight: "500",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
          },
          success: {
            style: {
              background: "#f7fff9",
              color: "#166534",
            },
          },
          error: {
            style: {
              background: "#fff8f8",
              color: "#991b1b",
            },
          },
        }}
      />
    </BrowserRouter>
  </StrictMode>,
);
