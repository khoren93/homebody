import { type ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Banner } from '@/components/Banner';
import { IconLink } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Logo } from '@/components/Logo';
import { useFrameTicker } from '@/features/exercise/useFrameTicker';
import { useFormat } from '@/i18n/useFormat';
import { cx } from '@/lib/cx';
import { type Route, routeHref, tabOf, useRoute } from '@/lib/router';
import { useToday } from '@/lib/useToday';
import { useAppStore } from '@/store';

import styles from './AppShell.module.css';
import { TabBar } from './TabBar';
import { UpdatePrompt } from './UpdatePrompt';

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
  const today = useToday();
  const format = useFormat();
  // During a workout the chrome steps back: no header, no tab bar.
  const immersive = route.name === 'session';
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
      <div className={cx(styles.frame, immersive && styles.immersive)}>
        {!immersive && (
          <header className={styles.header}>
            <a className={styles.brand} href={routeHref({ name: 'plan' })}>
              <Logo />
              <span className={styles.wordmark}>{t('app.name').toLowerCase()}</span>
            </a>
            <div className={styles.meta}>
              <time dateTime={today}>{format.date(today)}</time>
              <IconLink
                href={routeHref({ name: 'settings' })}
                label={t('nav.openSettings')}
                aria-current={route.name === 'settings' ? 'page' : undefined}
              >
                <Icon name="settings" />
              </IconLink>
            </div>
          </header>
        )}
        <UpdatePrompt />
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
      {!immersive && <TabBar current={tabOf(route)} />}
    </>
  );
}
