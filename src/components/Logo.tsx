import styles from './Logo.module.css';

/** The Homebody mark: a roofline over a barbell on an ember square. */
export function Logo() {
  return (
    <svg className={styles.logo} viewBox="0 0 30 30" aria-hidden="true" focusable="false">
      <rect className={styles.plate} width="30" height="30" rx="9" />
      <path className={styles.line} d="M7.5 15.5 L15 9 L22.5 15.5" />
      <path className={styles.line} d="M10 21 H20 M10 18.5 V23.5 M20 18.5 V23.5" />
    </svg>
  );
}
