import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/electron/renderer';
import App from './App';
import './styles/globals.css';
// Initialize i18n before rendering — must be imported before any component that uses useTranslation
import './i18n';

// Initialize Sentry in the renderer process. DSN is passed via VITE_SENTRY_DSN env var.
// Works in coordination with the main-process Sentry init in electron-main.ts.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
if (sentryDsn) {
  Sentry.init({ dsn: sentryDsn });
}

// Bridge renderer console.* to electron-log so logs appear in production log files.
// Only installed when running inside Electron (window.electron is defined).
if (typeof window !== 'undefined' && window.electron?.log) {
  const bridge = window.electron.log;
  const origConsole = { ...console };
  console.log = (...args) => {
    origConsole.log(...args);
    bridge('info', args[0] as string, ...args.slice(1));
  };
  console.info = (...args) => {
    origConsole.info(...args);
    bridge('info', args[0] as string, ...args.slice(1));
  };
  console.warn = (...args) => {
    origConsole.warn(...args);
    bridge('warn', args[0] as string, ...args.slice(1));
  };
  console.error = (...args) => {
    origConsole.error(...args);
    bridge('error', args[0] as string, ...args.slice(1));
  };
  console.debug = (...args) => {
    origConsole.debug(...args);
    bridge('debug', args[0] as string, ...args.slice(1));
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
