import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// Register Service Worker for PWA Offline Resilience & Zero-Touch Hot Reload (Pilar 8)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      // Verificación periódica en segundo plano cada 15 min
      setInterval(() => {
        registration.update().catch(() => {});
      }, 15 * 60 * 1000);

      // Revalidación inmediata al volver al foco o recuperar red
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update().catch(() => {});
        }
      });
      window.addEventListener('online', () => {
        registration.update().catch(() => {});
      });
    }).catch((err) => {
      console.warn('Service Worker registration skipped/failed:', err);
    });

    // Recarga automática en controllerchange con guardián anti-loop en sessionStorage
    let refreshing = false;
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing || !hadController) return; // evita recarga en la primera instalación
      const lastReload = sessionStorage.getItem('sw_last_reload');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        refreshing = true;
        sessionStorage.setItem('sw_last_reload', now.toString());
        window.location.reload();
      }
    });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

