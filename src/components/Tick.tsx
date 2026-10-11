import styles from './Tick.module.css';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Describes what is being ticked off; not shown visually. */
  label: string;
};

/** A round check mark for ticking something off. A native checkbox underneath. */
export function Tick({ checked, onChange, label }: Props) {
  return (
    <label className={styles.tick}>
      <input
        type="checkbox"
        className={styles.input}
        checked={checked}
        aria-label={label}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className={styles.mark} aria-hidden="true" />
    </label>
  );
}
