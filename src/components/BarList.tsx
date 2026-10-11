import type { ReactNode } from 'react';

import { cx } from '@/lib/cx';

import styles from './BarList.module.css';

export type BarListRow = {
  id: string;
  label: ReactNode;
  value: number;
  /** Text shown for the value. */
  valueText: string;
  /** Visual emphasis of the bar, 0 (none) to 4 (strongest). */
  tier?: 0 | 1 | 2 | 3 | 4;
  selected?: boolean;
};

type Props = {
  rows: readonly BarListRow[];
  /** The value that fills the whole track. */
  max: number;
  /** Makes rows selectable. */
  onSelect?: (id: string) => void;
};

function Bar({ row, max }: { row: BarListRow; max: number }) {
  const percent = (value: number) => `${Math.min(100, Math.max(0, (value / max) * 100))}%`;
  return (
    <span className={styles.track} aria-hidden="true">
      <span
        className={cx(styles.fill, row.tier !== undefined && styles[`tier${row.tier}`])}
        style={{ inlineSize: percent(row.value) }}
      />
    </span>
  );
}

/** Design system: HeatScale bars. A ranked list of labelled horizontal bars. */
export function BarList({ rows, max, onSelect }: Props) {
  return (
    <ul className={styles.list}>
      {rows.map((row) => {
        const content = (
          <>
            <span className={styles.label}>{row.label}</span>
            <Bar row={row} max={max} />
            <span className={styles.value}>{row.valueText}</span>
          </>
        );
        return (
          <li key={row.id}>
            {onSelect ? (
              <button
                type="button"
                className={cx(styles.row, styles.button, row.selected && styles.selected)}
                aria-pressed={!!row.selected}
                onClick={() => onSelect(row.id)}
              >
                {content}
              </button>
            ) : (
              <span className={styles.row}>{content}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
