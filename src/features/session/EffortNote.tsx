import { useTranslation } from 'react-i18next';

import type { LoadedSession } from '@/engine';
import { cx } from '@/lib/cx';

import styles from './EffortNote.module.css';

/** Explains how hard the sets of this session should feel. */
export function EffortNote({ session }: { session: Pick<LoadedSession, 'deload' | 'rir'> }) {
  const { t } = useTranslation();
  return (
    <div className={styles.note}>
      <span className={styles.dots} aria-hidden="true">
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={cx(styles.dot, n <= session.rir && styles.on)} />
        ))}
      </span>
      <p>
        {session.deload ? (
          <>
            <strong>{t('session.rir.deloadTitle')}</strong> {t('session.rir.deloadBody')}
          </>
        ) : (
          <>
            <strong>{t('session.rir.title', { count: session.rir })}</strong>{' '}
            {t('session.rir.body', { count: session.rir })}
          </>
        )}
      </p>
    </div>
  );
}
