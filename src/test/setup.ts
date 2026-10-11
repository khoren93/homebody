import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

import { i18n, initI18n } from '@/i18n';
import { initStore } from '@/store';
import { createMemoryPersistence } from '@/store/persistence';

// Tests run in English unless they switch the language themselves.
initI18n('en');

/** The date tests run on unless they pass their own: a Wednesday. */
export const TEST_TODAY = '2026-10-14';

beforeEach(async () => {
  localStorage.clear();
  if (i18n.language !== 'en') await i18n.changeLanguage('en');
  // Every test starts from a fresh first launch: the sample profile, kept in memory.
  await initStore({ persistence: createMemoryPersistence(), today: TEST_TODAY });
});

afterEach(() => {
  cleanup();
});
