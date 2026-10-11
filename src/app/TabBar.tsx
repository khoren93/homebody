import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/Icon';
import { routeHref, type TabName, TABS } from '@/lib/router';

import styles from './TabBar.module.css';

/** Bottom navigation between the five sections of the app. */
export function TabBar({ current }: { current: TabName }) {
  const { t } = useTranslation();

  return (
    <nav className={styles.bar} aria-label={t('nav.label')}>
      <ul className={styles.list}>
        {TABS.map((tab) => (
          <li key={tab} className={styles.item}>
            <a
              className={styles.link}
              href={routeHref({ name: tab })}
              aria-current={tab === current ? 'page' : undefined}
            >
              <Icon name={tab} />
              <span className={styles.label}>{t(`nav.${tab}`)}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
