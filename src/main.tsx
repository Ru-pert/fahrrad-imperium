import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './ui/App';
import '@fontsource-variable/bricolage-grotesque';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Service Worker: neue Version sofort übernehmen und Seite einmal neu laden
if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      window.location.reload();
    },
    onRegisteredSW(_url, reg) {
      // stündlich und beim Zurückkehren in den Tab nach Updates suchen
      if (!reg) return;
      setInterval(() => void reg.update(), 60 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void reg.update();
      });
    },
  });
  let neuGeladen = false;
  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    if (neuGeladen) return;
    neuGeladen = true;
    window.location.reload();
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
