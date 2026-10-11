import styles from './ProgressRing.module.css';

const RADIUS = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** A small ring that fills as work gets done. */
export function ProgressRing({ value, max, label }: { value: number; max: number; label: string }) {
  const share = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <svg className={styles.ring} viewBox="0 0 44 44" role="img" aria-label={label}>
      <circle className={styles.track} cx="22" cy="22" r={RADIUS} />
      {share > 0 && (
        <circle
          className={styles.fill}
          cx="22"
          cy="22"
          r={RADIUS}
          strokeDasharray={`${share * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          transform="rotate(-90 22 22)"
        />
      )}
    </svg>
  );
}
