import type { ReactNode } from 'react';

import { cx } from '@/lib/cx';

import styles from './Stat.module.css';

type Props = {
  value: ReactNode;
  label?: ReactNode;
  /** A mono caption above the value. */
  eyebrow?: ReactNode;
  /** A line under the value, such as the change since the start. */
  change?: ReactNode;
  /** `good` moves in the wanted direction, `accent` against it. */
  changeTone?: 'good' | 'accent' | 'muted';
};

/** Design system: StatTile. One number first, with its label. Use inside {@link StatGrid}. */
export function Stat({ value, label, eyebrow, change, changeTone = 'muted' }: Props) {
  return (
    <div className={styles.tile}>
      {eyebrow != null && <dt className={styles.eyebrow}>{eyebrow}</dt>}
      <dd className={styles.value}>{value}</dd>
      {label != null && <dt className={styles.label}>{label}</dt>}
      {change != null && <dd className={cx(styles.change, styles[changeTone])}>{change}</dd>}
    </div>
  );
}

type GridProps = {
  children: ReactNode;
  /** Number of columns; tiles wrap automatically when omitted. */
  columns?: 2 | 3 | 4;
  /** Tiles inside a card sit on the well color and have no card of their own. */
  look?: 'tiles' | 'wells' | 'plain';
};

export function StatGrid({ children, columns, look = 'tiles' }: GridProps) {
  return (
    <dl className={cx(styles.grid, columns && styles[`cols${columns}`], styles[look])}>
      {children}
    </dl>
  );
}
