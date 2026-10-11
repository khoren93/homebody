import { type InputHTMLAttributes, type ReactNode, useId } from 'react';

import { cx } from '@/lib/cx';

import styles from './Field.module.css';

type ControlProps = { id: string; 'aria-describedby'?: string };

type FieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  /** Renders the control; spread the given props on it to wire up the label and hint. */
  children: (control: ControlProps) => ReactNode;
  className?: string;
};

/** A labelled form control with an optional hint. */
export function Field({ label, hint, children, className }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const control: ControlProps = hint != null ? { id, 'aria-describedby': hintId } : { id };

  return (
    <div className={cx(styles.field, className)}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children(control)}
      {hint != null && (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      )}
    </div>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(styles.control, className)} {...rest} />;
}
