import type { ReactNode } from 'react';

import styles from './Icon.module.css';

const PATHS = {
  plan: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  calculator: <path d="M2.5 12h3M18.5 12h3M5.5 8v8M18.5 8v8M8 6.5v11M16 6.5v11M8 12h8" />,
  muscles: (
    <>
      <circle cx="12" cy="4.5" r="2.2" />
      <path d="M7 8.5Q12 7 17 8.5L15.5 14 14 21M8.5 14 10 21M7 8.5 5 14M17 8.5 19 14M8.5 14Q12 15 15.5 14" />
    </>
  ),
  body: (
    <>
      <path d="M4 18l5-6 4 3 7-9" />
      <path d="M15 6h5v5" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </>
  ),
  expand: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  shuffle: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
      <path d="M8.5 8.5h.01M15.5 15.5h.01M15.5 8.5h.01M8.5 15.5h.01M12 12h.01" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

/** A decorative line icon. Always pair it with visible or hidden text. */
export function Icon({ name }: { name: IconName }) {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  );
}
