import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

import { i18n, initI18n } from '@/i18n';

// Tests run in English unless they switch the language themselves.
initI18n('en');

beforeEach(async () => {
  localStorage.clear();
  if (i18n.language !== 'en') await i18n.changeLanguage('en');
});

afterEach(() => {
  cleanup();
});
