/**
 * Small UI preferences kept in localStorage (theme, language, list density).
 * Everything else lives in IndexedDB. Storage may be unavailable (private
 * mode, blocked site data), so every access is guarded and failures are
 * silent: a preference that cannot be saved is simply not remembered.
 */
const PREFIX = 'homebody.';

export function readPref(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function writePref(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(PREFIX + key);
    else localStorage.setItem(PREFIX + key, value);
  } catch {
    // Not being able to remember a preference is not an error worth surfacing.
  }
}
