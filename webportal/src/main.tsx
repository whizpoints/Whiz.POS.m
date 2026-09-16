import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Global fix: Prevent number inputs from changing value when scrolling the mouse wheel
document.addEventListener('wheel', (_event) => {
  if (document.activeElement?.tagName === 'INPUT' && (document.activeElement as HTMLInputElement).type === 'number') {
    (document.activeElement as HTMLInputElement).blur();
  }
}, { passive: false });

// Global Fetch Interceptor for Account Suspension
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  if (response.status === 403) {
    try {
      const cloned = response.clone();
      const data = await cloned.json();
      if (data?.error === 'ACCOUNT_SUSPENDED') {
        localStorage.removeItem('whiz-token');
        localStorage.removeItem('whiz-user');
        window.location.href = '/auth?suspended=true';
      }
    } catch (e) {
      // Ignore if not JSON
    }
  }
  return response;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
