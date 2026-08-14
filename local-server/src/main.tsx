import { StrictMode } from 'react'

window.addEventListener('error', (event) => {
  document.body.innerHTML = `<div style="color:red;padding:20px;font-family:monospace;white-space:pre-wrap;background:white;z-index:9999;position:absolute;inset:0;"><h2>Runtime Error:</h2>${event.error?.stack || event.message}</div>`;
});
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Global fix: Prevent number inputs from changing value when scrolling the mouse wheel
document.addEventListener('wheel', (_event) => {
  if (document.activeElement?.tagName === 'INPUT' && (document.activeElement as HTMLInputElement).type === 'number') {
    (document.activeElement as HTMLInputElement).blur();
  }
}, { passive: false });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
