import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import AppErrorBoundary from './components/AppErrorBoundary.tsx';

const PRELOAD_RECOVERY_KEY = 'careerhub.preload-recovery';
const PRELOAD_RECOVERY_WINDOW_MS = 60_000;

type VitePreloadErrorEvent = Event & {
  payload?: Error;
};

window.addEventListener('vite:preloadError', (event) => {
  const preloadEvent = event as VitePreloadErrorEvent;
  const signature = preloadEvent.payload?.message || window.location.href;
  const now = Date.now();

  try {
    const previous = JSON.parse(window.sessionStorage.getItem(PRELOAD_RECOVERY_KEY) || 'null') as {
      signature?: string;
      timestamp?: number;
    } | null;
    const alreadyRetried =
      previous?.signature === signature &&
      typeof previous.timestamp === 'number' &&
      now - previous.timestamp < PRELOAD_RECOVERY_WINDOW_MS;

    if (alreadyRetried) return;

    window.sessionStorage.setItem(
      PRELOAD_RECOVERY_KEY,
      JSON.stringify({ signature, timestamp: now })
    );
  } catch {
    // Without storage we cannot guarantee a one-time retry, so let the error boundary take over.
    return;
  }

  event.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>
);
