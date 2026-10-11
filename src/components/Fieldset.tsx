import type { ReactNode } from 'react';

import styles from './Fieldset.module.css';

/** Groups related controls under a caption, without the default fieldset chrome. */
export function Fieldset({ legend, children }: { legend: ReactNode; children: ReactNode }) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{legend}</legend>
      {children}
    </fieldset>
  );
}
