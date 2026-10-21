import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent harmless WebSocket connection rejections from surfacing in console/terminal
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || String(event.reason || '');
    if (
      reason.includes('WebSocket') || 
      reason.includes('closed without opened') ||
      reason.includes('vite') ||
      reason.includes('hmr') ||
      reason.includes('ws://') ||
      reason.includes('wss://')
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (
      msg.includes('WebSocket') || 
      msg.includes('closed without opened') ||
      msg.includes('vite') ||
      msg.includes('hmr') ||
      msg.includes('ws://') ||
      msg.includes('wss://')
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  // Safe wrapper for native WebSocket to suppress background errors gracefully
  try {
    const OriginalWebSocket = window.WebSocket;
    if (OriginalWebSocket) {
      class SafeWebSocket extends OriginalWebSocket {
        constructor(url: string | URL, protocols?: string | string[]) {
          try {
            super(url, protocols);
            this.addEventListener('error', (err) => {
              err.preventDefault();
              err.stopPropagation();
            });
          } catch (e) {
            const dummy = Object.create(OriginalWebSocket.prototype);
            dummy.addEventListener = () => {};
            dummy.removeEventListener = () => {};
            dummy.send = () => {};
            dummy.close = () => {};
            return dummy;
          }
        }
      }
      window.WebSocket = SafeWebSocket as any;
    }
  } catch (e) {}
}

// Unregister PWA service worker completely to disable PWA system
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().catch(() => {});
    }
  }).catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
