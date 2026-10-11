import type { IsoDate } from '@/engine';
import { useFormat } from '@/i18n/useFormat';

import styles from './DateBadge.module.css';

/** A compact calendar-style date: weekday, day of month, month. */
export function DateBadge({ date }: { date: IsoDate }) {
  const format = useFormat();
  const parts = format.dateParts(date);
  return (
    <time className={styles.badge} dateTime={date}>
      <span className={styles.small}>{parts.weekday}</span>
      <span className={styles.day}>{parts.day}</span>
      <span className={styles.small}>{parts.month}</span>
    </time>
  );
}
