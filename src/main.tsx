import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { setupElectronMock } from './electronApiMock';
import App from "./App";
import { ToastProvider } from "./components/ui/use-toast";

// In a browser-based development environment (like for Playwright),
// mock the Electron-specific APIs before the app starts.
setupElectronMock();

// Global fix: Prevent number inputs from changing value when scrolling the mouse wheel
document.addEventListener('wheel', (event) => {
  if (document.activeElement?.tagName === 'INPUT' && (document.activeElement as HTMLInputElement).type === 'number') {
    (document.activeElement as HTMLInputElement).blur();
  }
}, { passive: false });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>
);
