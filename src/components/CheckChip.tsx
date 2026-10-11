import type { ReactNode } from 'react';

import { cx } from '@/lib/cx';

import styles from './CheckChip.module.css';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  /** Shows a check box mark next to the label. */
  marker?: boolean;
  className?: string;
};

/** An on/off choice presented as a chip. It is a native checkbox underneath. */
export function CheckChip({ checked, onChange, children, marker = false, className }: Props) {
  return (
    <label className={cx(styles.chip, className)}>
      <input
        type="checkbox"
        className={styles.input}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className={cx(styles.label, marker && styles.withMarker)}>{children}</span>
    </label>
  );
}
