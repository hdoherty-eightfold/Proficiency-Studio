import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';
// Initialize i18n before rendering — must be imported before any component that uses useTranslation
import './i18n';

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
