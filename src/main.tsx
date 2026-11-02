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

// Global Selection Guard: Disables accidental text selection & Ctrl+A across non-editable UI
const isElementSelectable = (el: EventTarget | null): boolean => {
  if (!el) return false;
  const node = (el as Node).nodeType === Node.TEXT_NODE ? (el as Node).parentElement : (el as HTMLElement);
  if (!node || !(node instanceof HTMLElement)) return false;
  if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') return true;
  if (node.isContentEditable) return true;
  if (node.closest('input, textarea, [contenteditable="true"], [contenteditable=""], .selectable')) return true;
  return false;
};

// Intercept Ctrl+A / Cmd+A when focus is outside editable text fields
window.addEventListener('keydown', (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
    const active = document.activeElement;
    const target = e.target;
    if (!isElementSelectable(active) && !isElementSelectable(target)) {
      e.preventDefault();
      e.stopPropagation();
      window.getSelection()?.removeAllRanges();
    }
  }
}, true);

// Prevent drag-to-select and double-click selection on UI text outside inputs
document.addEventListener('selectstart', (e: Event) => {
  if (!isElementSelectable(e.target)) {
    e.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>
);
