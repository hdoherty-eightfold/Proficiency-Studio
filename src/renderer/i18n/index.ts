/**
 * i18n Configuration
 *
 * Internationalization setup using i18next + react-i18next.
 * Currently ships English only. Add new locales by:
 *   1. Creating src/renderer/i18n/locales/<lang>.json
 *   2. Importing it here and adding to `resources`
 *   3. Adding the locale to the `supportedLngs` array
 *
 * @see https://react.i18next.com/
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';

export const defaultNS = 'translation';

export const resources = {
  en: { translation: en },
} as const;

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  defaultNS,
  supportedLngs: ['en'],
  interpolation: {
    // React already escapes values, so no need for i18next escaping
    escapeValue: false,
  },
  // Disable missing key warnings in production
  missingKeyHandler: import.meta.env.DEV
    ? (lngs, ns, key) => {
        console.warn(`[i18n] Missing translation key: ${ns}:${key} (${lngs.join(', ')})`);
      }
    : false,
});

export default i18n;
