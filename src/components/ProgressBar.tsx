import styles from './ProgressBar.module.css';

type Props = { value: number; max: number; label: string };

export function ProgressBar({ value, max, label }: Props) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      className={styles.track}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <span className={styles.fill} style={{ inlineSize: `${percent}%` }} />
    </div>
  );
}
