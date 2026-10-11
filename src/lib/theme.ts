import { useSyncExternalStore } from 'react';

import { readPref, writePref } from './storage';

export const THEMES = ['system', 'light', 'dark'] as const;

/** `system` follows the device setting; the other two override it. */
export type Theme = (typeof THEMES)[number];

const PREF_KEY = 'theme';
const listeners = new Set<() => void>();

export function getTheme(): Theme {
  const saved = readPref(PREF_KEY);
  return saved === 'light' || saved === 'dark' ? saved : 'system';
}

/** Reflects the theme on <html>, where the design tokens pick it up. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
}

export function setTheme(theme: Theme): void {
  writePref(PREF_KEY, theme === 'system' ? null : theme);
  applyTheme(theme);
  listeners.forEach((notify) => notify());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The selected theme and a setter that remembers the choice on the device. */
export function useTheme(): [Theme, (theme: Theme) => void] {
  return [useSyncExternalStore(subscribe, getTheme), setTheme];
}
