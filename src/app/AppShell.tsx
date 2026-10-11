import { type ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Banner } from '@/components/Banner';
import { Icon } from '@/components/Icon';
import { Logo } from '@/components/Logo';
import { useFrameTicker } from '@/features/exercise/useFrameTicker';
import { type Route, routeHref, tabOf, useRoute } from '@/lib/router';
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
  useFrameTicker();

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
          <a className={styles.brand} href={routeHref({ name: 'plan' })}>
            <Logo />
            <span className={styles.wordmark}>{t('app.name').toLowerCase()}</span>
          </a>
          <a
            className={styles.settings}
            href={routeHref({ name: 'settings' })}
            aria-label={t('nav.openSettings')}
            aria-current={route.name === 'settings' ? 'page' : undefined}
          >
            <Icon name="settings" />
          </a>
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
      {route.name !== 'session' && <TabBar current={tabOf(route)} />}
    </>
  );
}
