import './zod-setup';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { registerPwa } from './app/pwa';
import { toIsoDate } from './engine';
import { initI18n } from './i18n';
import { applyTheme, getTheme } from './lib/theme';
import { flushStore, initStore } from './store';
import { HomebodyDb } from './store/db';
import { createDexiePersistence } from './store/persistence';

initI18n();
applyTheme(getTheme());

void initStore({
  persistence: createDexiePersistence(new HomebodyDb()),
  today: toIsoDate(new Date()),
});

// Make sure the last edits are written before the page goes away.
window.addEventListener('pagehide', () => void flushStore());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') void flushStore();
});

void registerPwa();

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root is missing from index.html');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
