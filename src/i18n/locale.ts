import { readPref, writePref } from '@/lib/storage';

/** Supported UI languages. The first one is the fallback. */
export const LOCALES = ['en', 'ru'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** Each language named in itself, for the language switch. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  ru: 'Русский',
};

const PREF_KEY = 'locale';

/** Maps a BCP 47 tag such as `ru-RU` to a supported locale, if there is one. */
export function matchLocale(tag: string | null | undefined): Locale | undefined {
  const language = tag?.toLowerCase().split(/[-_]/)[0];
  return LOCALES.find((locale) => locale === language);
}

/** Like {@link matchLocale}, falling back to the default locale. */
export function toLocale(tag: string | null | undefined): Locale {
  return matchLocale(tag) ?? DEFAULT_LOCALE;
}

/**
 * The locale to start with: the user's saved choice, else the first browser
 * language we support, else English.
 */
export function detectLocale(browserLanguages: readonly string[] = navigator.languages): Locale {
  const saved = matchLocale(readPref(PREF_KEY));
  if (saved) return saved;
  for (const tag of browserLanguages) {
    const match = matchLocale(tag);
    if (match) return match;
  }
  return DEFAULT_LOCALE;
}

export function saveLocale(locale: Locale): void {
  writePref(PREF_KEY, locale);
}
