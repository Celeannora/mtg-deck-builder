import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { registerServiceWorker } from "./pwa";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

registerServiceWorker(() => {
  // Notify App via a custom DOM event so the banner can render
  window.dispatchEvent(new CustomEvent("sw-update-ready"));
});
