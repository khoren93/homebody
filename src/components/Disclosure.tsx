import type { ReactNode } from 'react';

import styles from './Disclosure.module.css';

/** A collapsible block. Uses the native details element, so it works without scripting. */
export function Disclosure({ summary, children }: { summary: ReactNode; children: ReactNode }) {
  return (
    <details className={styles.details}>
      <summary className={styles.summary}>{summary}</summary>
      <div className={styles.body}>{children}</div>
    </details>
  );
}
