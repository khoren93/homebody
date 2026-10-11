import { describe, expect, it } from 'vitest';

import { i18n, setLocale } from '..';
import { detectLocale, matchLocale, saveLocale, toLocale } from '../locale';

describe('locale detection', () => {
  it('matches language tags regardless of region and case', () => {
    expect(matchLocale('ru')).toBe('ru');
    expect(matchLocale('ru-RU')).toBe('ru');
    expect(matchLocale('EN_us')).toBe('en');
    expect(matchLocale('de-DE')).toBeUndefined();
    expect(matchLocale(null)).toBeUndefined();
    expect(toLocale('de-DE')).toBe('en');
  });

  it('uses the first supported browser language', () => {
    expect(detectLocale(['de-DE', 'ru-RU', 'en-US'])).toBe('ru');
    expect(detectLocale(['en-GB', 'ru'])).toBe('en');
  });

  it('falls back to English when no browser language is supported', () => {
    expect(detectLocale(['de-DE', 'fr'])).toBe('en');
    expect(detectLocale([])).toBe('en');
  });

  it('prefers the saved choice over the browser language', () => {
    saveLocale('ru');
    expect(detectLocale(['en-US'])).toBe('ru');
  });

  it('ignores a saved value that is not a supported locale', () => {
    localStorage.setItem('homebody.locale', 'xx');
    expect(detectLocale(['ru'])).toBe('ru');
  });
});

describe('setLocale', () => {
  it('changes the language, the document language and the saved choice', async () => {
    await setLocale('ru');
    expect(i18n.language).toBe('ru');
    expect(document.documentElement.lang).toBe('ru');
    expect(detectLocale(['en'])).toBe('ru');
    expect(i18n.t('nav.plan')).toBe('План');
  });

  it('applies Russian plural rules', async () => {
    await setLocale('ru');
    expect([1, 2, 5, 21, 11].map((count) => i18n.t('units.sets', { count }))).toEqual([
      '1 подход',
      '2 подхода',
      '5 подходов',
      '21 подход',
      '11 подходов',
    ]);
  });

  it('applies English plural rules', () => {
    expect([1, 2].map((count) => i18n.t('units.reps', { count }))).toEqual(['1 rep', '2 reps']);
  });
});
