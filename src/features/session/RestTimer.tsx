import { useTranslation } from 'react-i18next';

import { formatClock } from '@/i18n/format';
import { cx } from '@/lib/cx';

import styles from './RestTimer.module.css';
import type { RestTimerState } from './useRestTimer';

type Props = {
  timer: NonNullable<RestTimerState>;
  onAdjust: (seconds: number) => void;
  onStop: () => void;
};

/**
 * Design system: RestTimer. Floats at the bottom of the workout, inverted
 * against the theme, and counts down the rest before the next set.
 */
export function RestTimer({ timer, onAdjust, onStop }: Props) {
  const { t } = useTranslation();
  const over = timer.remaining <= 0;
  const elapsed = timer.total > 0 ? 1 - Math.max(0, timer.remaining) / timer.total : 1;

  return (
    <div className={styles.wrap}>
      <div
        className={cx(styles.timer, over && styles.over)}
        role="timer"
        aria-label={t('session.timer.label')}
      >
        <div className={styles.track} aria-hidden="true">
          <div className={styles.fill} style={{ inlineSize: `${Math.min(1, elapsed) * 100}%` }} />
        </div>
        <div className={styles.body}>
          <div className={styles.top}>
            <span className={styles.time}>
              {over ? t('session.timer.go') : formatClock(timer.remaining)}
            </span>
            <div className={styles.next}>
              <div className={styles.title}>{timer.target.title}</div>
              <div className={styles.detail}>{timer.target.detail}</div>
            </div>
          </div>
          <div className={styles.buttons}>
            {!over && (
              <>
                <button
                  type="button"
                  className={styles.button}
                  aria-label={t('session.timer.minusLabel')}
                  onClick={() => onAdjust(-15)}
                >
                  {t('session.timer.minus')}
                </button>
                <button
                  type="button"
                  className={styles.button}
                  aria-label={t('session.timer.plusLabel')}
                  onClick={() => onAdjust(15)}
                >
                  {t('session.timer.plus')}
                </button>
              </>
            )}
            <button type="button" className={cx(styles.button, styles.skip)} onClick={onStop}>
              {t(over ? 'session.timer.ok' : 'session.timer.skip')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
