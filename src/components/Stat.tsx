import type { ReactNode } from 'react';

import styles from './Stat.module.css';

/** A key figure with a caption. Use inside {@link StatGrid}. */
export function Stat({ value, label }: { value: ReactNode; label: ReactNode }) {
  return (
    <div className={styles.stat}>
      <dd className={styles.value}>{value}</dd>
      <dt className={styles.label}>{label}</dt>
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <dl className={styles.grid}>{children}</dl>;
}
