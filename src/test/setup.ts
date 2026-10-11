import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

import { i18n, initI18n } from '@/i18n';
import { initStore, resetPhotos } from '@/store';
import { createMemoryPersistence } from '@/store/persistence';

// Tests run in English unless they switch the language themselves.
initI18n('en');

/** The date tests run on: a Wednesday. */
export const TEST_TODAY = '2026-10-14';

// Only the clock is faked, so "today" is stable while timers keep running normally.
vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 14, 12, 0) });

// jsdom has no layout, so there is nothing to scroll.
Element.prototype.scrollIntoView = () => undefined;

beforeEach(async () => {
  localStorage.clear();
  if (i18n.language !== 'en') await i18n.changeLanguage('en');
  // Every test starts from a fresh first launch: the sample profile, kept in memory.
  await initStore({ persistence: createMemoryPersistence(), today: TEST_TODAY });
  resetPhotos();
});

afterEach(() => {
  cleanup();
});
