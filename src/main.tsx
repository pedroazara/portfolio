import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';
import { MotionConfig } from 'motion/react';
import { initializeAnalytics, initializeMonitoring } from './lib/observability';
initializeMonitoring().catch(() => {});
initializeAnalytics();
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').then(registration => {
    const notify = () => window.dispatchEvent(new CustomEvent('portfolio:update', { detail: registration }));
    if (registration.waiting) notify();
    registration.addEventListener('updatefound', () => {
      registration.installing?.addEventListener('statechange', () => {
        if (registration.waiting && navigator.serviceWorker.controller) notify();
      });
    });
  }).catch(() => {}));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <MotionConfig reducedMotion="user"><App /></MotionConfig>
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
);

