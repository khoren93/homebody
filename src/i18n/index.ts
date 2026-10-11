import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LOCALE, detectLocale, type Locale, LOCALES, saveLocale, toLocale } from './locale';
import en from './locales/en.json';
import ru from './locales/ru.json';

export const resources = {
  en: { translation: en },
  ru: { translation: ru },
} as const;

function syncDocumentLanguage(language: string): void {
  document.documentElement.lang = toLocale(language);
}

/** Initializes i18next once. Safe to call again (for example from tests). */
export function initI18n(locale: Locale = detectLocale()): typeof i18n {
  if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
      resources,
      lng: locale,
      fallbackLng: DEFAULT_LOCALE,
      supportedLngs: LOCALES,
      interpolation: { escapeValue: false }, // React escapes values already
      returnNull: false,
      initAsync: false,
    });
    i18n.on('languageChanged', syncDocumentLanguage);
    syncDocumentLanguage(locale);
  } else if (toLocale(i18n.language) !== locale) {
    void i18n.changeLanguage(locale);
  }
  return i18n;
}

/** Switches the UI language and remembers the choice. */
export async function setLocale(locale: Locale): Promise<void> {
  saveLocale(locale);
  await i18n.changeLanguage(locale);
}

export { i18n };
export * from './locale';
