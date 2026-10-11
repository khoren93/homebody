import { type ReactNode, useId } from 'react';

import { cx } from '@/lib/cx';

import styles from './Segmented.module.css';

export type SegmentedOption<T> = {
  value: T;
  label: ReactNode;
  /** Secondary text shown under the label. */
  hint?: ReactNode;
};

type Props<T> = {
  /** Names the group for assistive technology. */
  legend: string;
  /** Shows the legend as a visible caption above the options. */
  showLegend?: boolean;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

/**
 * A single-choice control. It is a group of native radio buttons, so arrow
 * keys, form semantics and screen reader announcements work out of the box.
 */
export function Segmented<T extends string | number | boolean>({
  legend,
  showLegend = false,
  options,
  value,
  onChange,
  className,
}: Props<T>) {
  const name = useId();

  return (
    <fieldset className={cx(styles.group, className)}>
      <legend className={showLegend ? styles.legend : styles.hiddenLegend}>{legend}</legend>
      <div className={styles.options}>
        {options.map((option) => (
          <label key={String(option.value)} className={styles.option}>
            <input
              type="radio"
              className={styles.input}
              name={name}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            <span className={styles.label}>
              {option.label}
              {option.hint != null && <span className={styles.hint}>{option.hint}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
