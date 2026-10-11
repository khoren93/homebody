import { type ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Banner } from '@/components/Banner';
import { type Route, tabOf, useRoute } from '@/lib/router';
import { useAppStore } from '@/store';

import styles from './AppShell.module.css';
import { TabBar } from './TabBar';

/** Scrolls to the top when the user moves to another screen. */
function useScrollReset(route: Route): void {
  const key = route.name === 'session' ? `session/${route.sessionId}` : route.name;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [key]);
}

/** Page chrome: skip link, storage notices, the current screen and the tab bar. */
export function AppShell({ children }: { children: (route: Route) => ReactNode }) {
  const { t } = useTranslation();
  const route = useRoute();
  const storage = useAppStore((store) => store.storage);
  const saveFailed = useAppStore((store) => store.saveFailed);
  useScrollReset(route);

  return (
    <>
      <a
        className={styles.skip}
        href="#main"
        onClick={(e) => {
          // Keep the hash for routing: move focus instead of navigating.
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        {t('shell.skip')}
      </a>
      <div className={styles.frame}>
        <header className={styles.header}>
          <span className={styles.brand}>{t('app.name')}</span>
          <span className={styles.storage}>
            {storage === 'indexeddb' ? t('shell.savedLocally') : null}
          </span>
        </header>
        {storage === 'memory' && <Banner role="alert">{t('shell.notSaved')}</Banner>}
        {saveFailed && (
          <Banner role="alert" tone="danger">
            {t('shell.saveFailed')}
          </Banner>
        )}
        <main id="main" className={styles.main} tabIndex={-1}>
          {children(route)}
        </main>
      </div>
      <TabBar current={tabOf(route)} />
    </>
  );
}
